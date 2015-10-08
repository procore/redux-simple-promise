'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.resolve = resolve;
exports.reject = reject;
exports['default'] = promiseMiddleware;

var _fluxStandardAction = require('flux-standard-action');

var transactionId = 0;

function isPromise(val) {
  return val && typeof val.then === 'function';
}

var RESOLVED_NAME = '_RESOLVED';
var REJECTED_NAME = '_REJECTED';

function resolve(actionName) {
  return actionName + RESOLVED_NAME;
}

function reject(actionName) {
  return actionName + REJECTED_NAME;
}

function promiseMiddleware(resolvedName, rejectedName) {
  var actionTransform = arguments.length <= 2 || arguments[2] === undefined ? function (x) {
    return x;
  } : arguments[2];
  var _ref = [resolvedName || RESOLVED_NAME, rejectedName || REJECTED_NAME];
  RESOLVED_NAME = _ref[0];
  REJECTED_NAME = _ref[1];

  return function (_ref2) {
    var dispatch = _ref2.dispatch;
    return function (next) {
      return function (action) {

        if (!_fluxStandardAction.isFSA(action) || !action.payload || !isPromise(action.payload.promise)) {
          return next(action);
        }

        // (1) Dispatch actionName with payload with arguments apart from promise

        // increment transactionId to be used by the original action and the async actions
        transactionId++;

        // Clone original action
        var newAction = {
          type: action.type,
          payload: _extends({}, action.payload)
        };

        if (Object.keys(newAction.payload).length === 1) {
          // No arguments beside promise, remove all payload
          delete newAction.payload;
        } else {
          // Other arguments, delete promise only
          delete newAction.payload.promise;
        }
        var status = null;
        dispatch(actionTransform(newAction, transactionId, status));

        // (2) Listen to promise and dispatch payload with new actionName
        return action.payload.promise.then(function (result) {
          status = RESOLVED_NAME;
          dispatch(actionTransform({
            type: resolve(action.type),
            payload: result,
            meta: newAction.payload
          }, transactionId, status));
          return result;
        }, function (error) {
          status = REJECTED_NAME;
          dispatch(actionTransform({
            type: reject(action.type),
            payload: error,
            meta: newAction.payload
          }, transactionId, status));
          return error;
        });
      };
    };
  };
}