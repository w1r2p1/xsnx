pragma solidity 0.5.15;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "./TradeAccounting.sol";
import "./helpers/Pausable.sol";

import "./interface/IKyberNetworkProxy.sol";
import "./interface/IxSNXAdmin.sol";

contract xSNX is ERC20, ERC20Detailed, Pausable, Ownable {
    TradeAccounting private tradeAccounting;
    IKyberNetworkProxy private kyberNetworkProxy;

    address xsnxAdmin;
    address snxAddress;
    address susdAddress;

    uint256 public withdrawableEthFees;

    function initialize(
        address payable _tradeAccountingAddress,
        address _kyberProxyAddress,
        address _snxAddress,
        address _susdAddress,
        address _xsnxAdmin,
        address _ownerAddress
    ) public initializer {
        Ownable.initialize(_ownerAddress);
        ERC20Detailed.initialize("xSNX", "xSNXa", 18);
        Pausable.initialize(_ownerAddress);

        tradeAccounting = TradeAccounting(_tradeAccountingAddress);
        kyberNetworkProxy = IKyberNetworkProxy(_kyberProxyAddress);
        snxAddress = _snxAddress;
        susdAddress = _susdAddress;
        xsnxAdmin = _xsnxAdmin;
    }

    event Mint(
        address indexed user,
        uint256 timestamp,
        uint256 valueSent,
        uint256 mintAmount,
        bool mintWithEth
    );
    event Burn(
        address indexed user,
        uint256 timestamp,
        uint256 burnAmount,
        uint256 valueToSend
    );
    event WithdrawFees(
        uint256 ethAmount,
        uint256 susdAmount,
        uint256 snxAmount
    );

    struct FeeDivisors {
        uint256 mintFee; // not charged on mintWithSnx
        uint256 burnFee;
        uint256 claimFee;
    }

    FeeDivisors public feeDivisors;

    /*
     * @notice Mint new xSNX tokens from the contract by sending ETH
     * @dev Exchanges ETH for SNX
     * @dev Min rate ETH/SNX sourced from Kyber in JS
     * @dev: Calculates overall fund NAV in ETH terms, using ETH/SNX price (via SNX oracle)
     * @dev: Mints/distributes new xSNX tokens based on contribution to NAV
     * @param: minRate: kyberProxy.getExpectedRate eth=>snx
     */
    function mint(uint256 minRate) external payable whenNotPaused {
        require(msg.value > 0, "Must send ETH");

        uint256 fee = calculateFee(msg.value, feeDivisors.mintFee);
        uint256 ethContribution = msg.value.sub(fee);
        uint256 snxBalanceBefore = tradeAccounting.getSnxBalance();

        uint256 totalSupply = totalSupply();
        (bool allocateToEth, uint256 nonSnxAssetValue) = tradeAccounting
            .getMintWithEthUtils(ethContribution, totalSupply);

        if (!allocateToEth) {
            uint256 snxAcquired = kyberNetworkProxy.swapEtherToToken.value(
                ethContribution
            )(ERC20(snxAddress), minRate);
            IERC20(snxAddress).transfer(xsnxAdmin, snxAcquired);
        } else {
            (bool success, ) = xsnxAdmin.call.value(ethContribution)("");
            require(success, "Transfer failed");
        }

        uint256 mintAmount = tradeAccounting.calculateTokensToMintWithEth(
            snxBalanceBefore,
            ethContribution,
            nonSnxAssetValue,
            totalSupply,
            allocateToEth
        );

        emit Mint(msg.sender, block.timestamp, msg.value, mintAmount, true);
        return super._mint(msg.sender, mintAmount);
    }

    /*
     * @notice Mint new xSNX tokens from the contract by sending SNX
     * @notice Won't run without ERC20 approval
     * @dev: Calculates overall fund NAV in ETH terms, using ETH/SNX price (via SNX oracle)
     * @dev: Mints/distributes new xSNX tokens based on contribution to NAV
     * @param: snxAmount: SNX to contribute
     */
    function mintWithSnx(uint256 snxAmount) external whenNotPaused {
        require(snxAmount > 0, "Must send SNX");
        uint256 snxBalanceBefore = tradeAccounting.getSnxBalance();

        uint256 fee = calculateFee(snxAmount, feeDivisors.mintFee);
        uint256 snxContribution = snxAmount.sub(fee);

        IERC20(snxAddress).transferFrom(msg.sender, address(this), fee);
        IERC20(snxAddress).transferFrom(msg.sender, xsnxAdmin, snxContribution);

        uint256 mintAmount = tradeAccounting.calculateTokensToMintWithSnx(
            snxBalanceBefore,
            snxContribution,
            totalSupply()
        );

        emit Mint(
            msg.sender,
            block.timestamp,
            snxContribution,
            mintAmount,
            false
        );
        return super._mint(msg.sender, mintAmount);
    }

    /*
     * @notice Redeems and burns xSNX tokens and sends ETH to user
     * @dev Checks if ETH reserve is sufficient to settle redeem obligation
     * @dev Will only redeem if ETH reserve is sufficient
     * @param tokensToRedeem
     */
    function burn(uint256 tokensToRedeem) external {
        require(tokensToRedeem > 0, "Must burn tokens");

        uint256 valueToRedeem = tradeAccounting.calculateRedemptionValue(
            totalSupply(),
            tokensToRedeem
        );

        require(
            tradeAccounting.getEthBalance() > valueToRedeem,
            "Redeem amount exceeds available liquidity"
        );

        IxSNXAdmin(xsnxAdmin).sendEthOnRedemption(valueToRedeem);
        uint256 valueToSend = valueToRedeem.sub(
            calculateFee(valueToRedeem, feeDivisors.burnFee)
        );
        super._burn(msg.sender, tokensToRedeem);
        emit Burn(msg.sender, block.timestamp, tokensToRedeem, valueToSend);

        (bool success, ) = msg.sender.call.value(valueToSend)("");
        require(success, "Burn transfer failed");
    }

    function calculateFee(uint256 _value, uint256 _feeDivisor)
        internal
        view
        returns (uint256 fee)
    {
        if (_feeDivisor > 0) {
            fee = _value.div(_feeDivisor);
        }
    }

    /*
     * @notice Inverse of fee i.e., a fee divisor of 100 == 1%
     * @notice Three fee types
     * @notice Mint fee never charged on mintWithSnx
     * @dev Mint fee 0 or <= 2%
     * @dev Burn fee 0 or <= 1%
     * @dev Claim fee 0 <= 4%
     */
    function setFeeDivisors(
        uint256 mintFeeDivisor,
        uint256 burnFeeDivisor,
        uint256 claimFeeDivisor
    ) public onlyOwner {
        require(mintFeeDivisor == 0 || mintFeeDivisor >= 50, "Invalid fee");
        require(burnFeeDivisor == 0 || burnFeeDivisor >= 100, "Invalid fee");
        require(claimFeeDivisor >= 25, "Invalid fee");
        feeDivisors.mintFee = mintFeeDivisor;
        feeDivisors.burnFee = burnFeeDivisor;
        feeDivisors.claimFee = claimFeeDivisor;
    }

    function withdrawFees() public onlyOwner {
        uint256 ethFeesToWithdraw = address(this).balance;
        uint256 susdFeesToWithdraw = IERC20(susdAddress).balanceOf(
            address(this)
        );
        uint256 snxFeesToWithdraw = IERC20(snxAddress).balanceOf(address(this));

        (bool success, ) = msg.sender.call.value(ethFeesToWithdraw)("");
        require(success, "Transfer failed");

        IERC20(susdAddress).transfer(msg.sender, susdFeesToWithdraw);
        IERC20(snxAddress).transfer(msg.sender, snxFeesToWithdraw);

        emit WithdrawFees(
            ethFeesToWithdraw,
            susdFeesToWithdraw,
            snxFeesToWithdraw
        );
    }

    function getClaimFeeDivisor() public view returns (uint256) {
        return feeDivisors.claimFee;
    }

    function() external payable {
        require(msg.sender == xsnxAdmin, "Invalid send");
    }
}
