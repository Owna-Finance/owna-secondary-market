// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecondaryMarket is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error SecondaryMarket__InvalidNonce(
        uint256 expectedNonce,
        uint256 actualNonce
    );
    error SecondaryMarket__InvalidSignature();
    error SecondaryMarket__InvalidMaker();
    error SecondaryMarket__InvalidMakerToken();
    error SecondaryMarket__InvalidTakerToken();
    error SecondaryMarket__InvalidMakerAmount();
    error SecondaryMarket__InvalidTakerAmount();

    struct SwapOrder {
        address maker;
        address makerToken;
        uint256 makerAmount;
        address takerToken;
        uint256 takerAmount;
        uint256 nonce;
    }

    mapping(address maker => uint256 nonce) private s_nonces;

    event SwapExecuted(
        address indexed maker,
        address indexed taker,
        address indexed makerToken,
        uint256 makerAmount,
        address takerToken,
        uint256 takerAmount
    );

    bytes32 private constant SWAP_ORDER_TYPEHASH =
        keccak256(
            "SwapOrder(address maker,address makerToken,uint256 makerAmount,address takerToken,uint256 takerAmount,uint256 nonce)"
        );

    constructor() EIP712("SecondaryMarket", "1") {}

    function executeSwap(
        SwapOrder calldata _order,
        bytes calldata _signature
    
        if (_order.maker == address(0)) {
            revert SecondaryMarket__InvalidMaker();
        }
        if (_order.makerToken == address(0)) {
            revert SecondaryMarket__InvalidMakerToken();
        }
        if (_order.takerToken == address(0)) {
            revert SecondaryMarket__InvalidTakerToken();
        }
        if (_order.makerAmount == 0) {
            revert SecondaryMarket__InvalidMakerAmount();
        }
        if (_order.takerAmount == 0) {
            revert SecondaryMarket__InvalidTakerAmount();
        }
        if (_order.nonce != s_nonces[_order.maker]) {
            revert SecondaryMarket__InvalidNonce(
                s_nonces[_order.maker],
                _order.nonce
            );
        }

        bytes32 orderHash = _hash(_order);
        address signer = ECDSA.recover(orderHash, _signature);
        if (signer != _order.maker) {
            revert SecondaryMarket__InvalidSignature();
        }

        s_nonces[_order.maker] += 1;

        IERC20 makerToken = IERC20(_order.makerToken);
        IERC20 takerToken = IERC20(_order.takerToken);

        makerToken.safeTransferFrom(
            _order.maker,
            msg.sender,
            _order.makerAmount
        );
        takerToken.safeTransferFrom(
            msg.sender,
            _order.maker,
            _order.takerAmount
        );

        emit SwapExecuted(
            _order.maker,
            msg.sender,
            _order.makerToken,
            _order.makerAmount,
            _order.takerToken,
            _order.takerAmount
        );
    }

    function getNonce(address _maker) external view returns (uint256) {
        return s_nonces[_maker];
    }

    function _hash(SwapOrder calldata _order) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        SWAP_ORDER_TYPEHASH,
                        _order.maker,
                        _order.makerToken,
                        _order.makerAmount,
                        _order.takerToken,
                        _order.takerAmount,
                        _order.nonce
                    )
                )
            );
    }
}
