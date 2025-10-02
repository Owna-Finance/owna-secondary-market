// SPDX-License-Identifier: MIT
pragma solidity 0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecondaryMarket is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OrderStatus {
        NONE,
        FILLED,
        CANCELLED
    }

    error SecondaryMarket__InvalidSignature();
    error SecondaryMarket__InvalidMaker();
    error SecondaryMarket__InvalidMakerToken();
    error SecondaryMarket__InvalidTakerToken();
    error SecondaryMarket__InvalidMakerAmount();
    error SecondaryMarket__InvalidTakerAmount();
    error SecondaryMarket__OrderAlreadyFilled(bytes32 orderHash);
    error SecondaryMarket__OrderAlreadyCancelled(bytes32 orderHash);

    struct SwapOrder {
        address maker;
        address makerToken;
        uint256 makerAmount;
        address takerToken;
        uint256 takerAmount;
        uint256 salt;
    }

    mapping(bytes32 orderHash => OrderStatus) private s_orderStatus;

    event SwapExecuted(
        address indexed maker,
        address indexed taker,
        address indexed makerToken,
        uint256 makerAmount,
        address takerToken,
        uint256 takerAmount
    );

    event OrderCancelled(
        address indexed maker,
        address indexed makerToken,
        uint256 makerAmount,
        address takerToken,
        uint256 takerAmount
    );

    bytes32 private constant SWAP_ORDER_TYPEHASH =
        keccak256(
            "SwapOrder(address maker,address makerToken,uint256 makerAmount,address takerToken,uint256 takerAmount,uint256 salt)"
        );

    constructor() EIP712("SecondaryMarket", "1") {}

    function executeSwap(
        SwapOrder calldata _order,
        bytes calldata _signature
    ) external nonReentrant {
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

        bytes32 orderHash = _hash(_order);
        if (s_orderStatus[orderHash] == OrderStatus.FILLED) {
            revert SecondaryMarket__OrderAlreadyFilled(orderHash);
        }
        if (s_orderStatus[orderHash] == OrderStatus.CANCELLED) {
            revert SecondaryMarket__OrderAlreadyCancelled(orderHash);
        }

        address signer = ECDSA.recover(orderHash, _signature);
        if (signer != _order.maker) {
            revert SecondaryMarket__InvalidSignature();
        }

        s_orderStatus[orderHash] = OrderStatus.FILLED;

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

    function cancelOrder(SwapOrder calldata _order) external {
        if (_order.maker != msg.sender) {
            revert SecondaryMarket__InvalidMaker();
        }

        bytes32 orderHash = _hash(_order);
        if (s_orderStatus[orderHash] == OrderStatus.FILLED) {
            revert SecondaryMarket__OrderAlreadyFilled(orderHash);
        }
        if (s_orderStatus[orderHash] == OrderStatus.CANCELLED) {
            revert SecondaryMarket__OrderAlreadyCancelled(orderHash);
        }

        s_orderStatus[orderHash] = OrderStatus.CANCELLED;

        emit OrderCancelled(
            _order.maker,
            _order.makerToken,
            _order.makerAmount,
            _order.takerToken,
            _order.takerAmount
        );
    }

    function getOrderStatus(
        bytes32 _orderHash
    ) external view returns (uint256 status) {
        OrderStatus orderStatus = s_orderStatus[_orderHash];
        if (orderStatus == OrderStatus.NONE) {
            status = 0;
        } else if (orderStatus == OrderStatus.FILLED) {
            status = 1;
        } else if (orderStatus == OrderStatus.CANCELLED) {
            status = 2;
        }

        return status;
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
                        _order.salt
                    )
                )
            );
    }
}
