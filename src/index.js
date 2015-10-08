import { isFSA } from 'flux-standard-action';

let transactionId = 0;

function isPromise(val) {
  return val && typeof val.then === 'function';
}

let [RESOLVED_NAME, REJECTED_NAME] = ['_RESOLVED', '_REJECTED'];

export function resolve(actionName) {
  return actionName + RESOLVED_NAME;
}

export function reject(actionName) {
  return actionName + REJECTED_NAME;
}

export default function promiseMiddleware(resolvedName, rejectedName, actionTransform = (x) => x) {
  [RESOLVED_NAME, REJECTED_NAME] = [resolvedName || RESOLVED_NAME, rejectedName || REJECTED_NAME];

  return ({ dispatch }) => next => action => {

    if (!isFSA(action) || !action.payload || !isPromise(action.payload.promise)) {
      return next(action);
    }

    // (1) Dispatch actionName with payload with arguments apart from promise

    // increment transactionId to be used by the original action and the async actions
    const transId = transactionId++;

    // Clone original action
    let newAction = {
      type: action.type,
      payload: {
        ...action.payload
      }
    };

    if (Object.keys(newAction.payload).length === 1) {
      // No arguments beside promise, remove all payload
      delete newAction.payload;
    } else {
      // Other arguments, delete promise only
      delete newAction.payload.promise;
    }
    let status = null;
    dispatch(actionTransform(newAction, transId, status));

    // (2) Listen to promise and dispatch payload with new actionName
    return action.payload.promise.then(
      function(result) {
        status = RESOLVED_NAME;
        dispatch(actionTransform({
          type: resolve(action.type),
          payload: result,
          meta: newAction.payload
        },
        this,
        status ));
        return result;
      }.bind(transId),
      function(error) {
        status = REJECTED_NAME;
        dispatch(actionTransform({
          type: reject(action.type),
          payload: error,
          meta: newAction.payload
        },
        this,
        status ));
        return error;
      }.bind(transId)
    );
  };
}
