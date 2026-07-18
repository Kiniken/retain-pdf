/**
 * Generic immutable store.
 *
 * Action reducers: `(state: TState, ...args) => Partial<TState> | TState`
 * Runtime always replaces state with the returned object (no deep merge).
 *
 * Typed call sites:
 *   createStore<State, Actions>({ initialState, actions })
 * or rely on inference from `initialState` + `actions`.
 *
 * Defaults are `any` so bare `createStore({...})` stays loose when inference
 * cannot pin a shape (and `actions` remains a string-index map).
 */

type IsAny<T> = 0 extends 1 & T ? true : false;

export type StoreActionResult<TState> = Partial<TState> | TState;

/** Action reducer: (state, ...args) => next state (or partial). */
export type StoreAction<TState, TArgs extends any[] = any[]> = (
  state: TState,
  ...args: TArgs
) => StoreActionResult<TState>;

/**
 * Map action reducer map → bound action API (state arg removed; returns snapshot).
 * When TActions is `any`, expose a string-index map so existing call sites keep working.
 */
export type BoundStoreActions<TState, TActions> = IsAny<TActions> extends true
  ? Record<string, (...args: any[]) => TState>
  : {
      [K in keyof TActions]: TActions[K] extends (
        state: any,
        ...args: infer TArgs
      ) => any
        ? (...args: TArgs) => TState
        : never;
    };

export type StoreChangeMeta<TState> = {
  action: string;
  previousState: TState;
  store: string;
};

export type StoreListener<TState> = (
  snapshot: TState,
  meta: StoreChangeMeta<TState>,
) => void;

export type StoreSetState<TState> = (
  updater: TState | ((state: TState) => StoreActionResult<TState>),
  actionName?: string,
) => TState;

export type StoreBatchApi<TState, TActions> = {
  actions: BoundStoreActions<TState, TActions>;
  getSnapshot: () => TState;
  setState: StoreSetState<TState>;
};

export type Store<TState = any, TActions = any> = {
  readonly name: string;
  batch: <TResult = TState>(
    callback: (api: StoreBatchApi<TState, TActions>) => TResult,
  ) => TResult;
  getSnapshot: () => TState;
  setState: StoreSetState<TState>;
  subscribe: (listener: StoreListener<TState>) => () => void;
  reset: (nextState?: TState) => TState;
  actions: Readonly<BoundStoreActions<TState, TActions>>;
};

export type CreateStoreOptions<TState, TActions> = {
  name?: string;
  initialState?: TState;
  actions?: TActions;
};

/**
 * Structural constraint for action maps.
 * Return type is intentionally loose (`any`) so call sites can annotate
 * `state: SomeState` even when `TState` is a narrower inferred object.
 * Documented contract remains Partial<TState> | TState.
 */
export type StoreActionsConstraint<TState> = Record<
  string,
  (state: TState, ...args: any[]) => any
>;

function freezeSnapshot<T>(value: T): T {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freezeSnapshot(item))) as T;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = freezeSnapshot(item);
  }
  return Object.freeze(copy) as T;
}

function cloneState<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value ?? null));
}

/**
 * Create a typed store. Defaults stay `any` so existing untyped call sites keep compiling.
 *
 * @example
 * const store = createStore<CounterState, CounterActions>({
 *   initialState: { count: 0 },
 *   actions: {
 *     inc(state, by = 1) {
 *       return { ...state, count: state.count + by };
 *     },
 *   },
 * });
 * store.actions.inc(2); // typed
 */
export function createStore<
  TState = any,
  TActions extends StoreActionsConstraint<TState> = any,
>({
  name = "store",
  initialState = {} as TState,
  actions = {} as TActions,
}: CreateStoreOptions<TState, TActions> = {} as CreateStoreOptions<
  TState,
  TActions
>): Store<TState, TActions> {
  let state = cloneState(initialState);
  const listeners = new Set<StoreListener<TState>>();
  let batchDepth = 0;
  let pendingNotification: {
    action: string;
    previousState: TState;
  } | null = null;

  function getSnapshot(): TState {
    return freezeSnapshot(cloneState(state));
  }

  function notify(actionName: string, previousState: TState) {
    const snapshot = getSnapshot();
    for (const listener of listeners) {
      listener(snapshot, {
        action: actionName,
        previousState: freezeSnapshot(cloneState(previousState)),
        store: name,
      });
    }
  }

  function queueNotification(actionName: string, previousState: TState) {
    if (batchDepth <= 0) {
      notify(actionName, previousState);
      return;
    }
    pendingNotification = {
      action: pendingNotification?.action || actionName,
      previousState: pendingNotification?.previousState || cloneState(previousState),
    };
  }

  function setState(
    updater: TState | ((state: TState) => StoreActionResult<TState>),
    actionName = "setState",
  ): TState {
    const previousState = state;
    const nextState = typeof updater === "function"
      ? (updater as (state: TState) => StoreActionResult<TState>)(cloneState(state))
      : updater;
    if (!nextState || typeof nextState !== "object") {
      throw new TypeError(`Store "${name}" action "${actionName}" must return an object state.`);
    }
    state = cloneState(nextState as TState);
    queueNotification(actionName, previousState);
    return getSnapshot();
  }

  const boundActions = {} as BoundStoreActions<TState, TActions>;
  for (const [actionName, action] of Object.entries(actions || {})) {
    if (typeof action !== "function") {
      continue;
    }
    (boundActions as Record<string, (...args: any[]) => TState>)[actionName] = (
      ...args: any[]
    ) => setState(
      (draft) => (action as StoreAction<TState>)(draft, ...args),
      actionName,
    );
  }

  function subscribe(listener: StoreListener<TState>) {
    if (typeof listener !== "function") {
      return () => {};
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function reset(nextState: TState = initialState) {
    return setState(cloneState(nextState), "reset");
  }

  function batch<TResult = TState>(
    callback: (api: StoreBatchApi<TState, TActions>) => TResult,
  ): TResult {
    if (typeof callback !== "function") {
      return getSnapshot() as unknown as TResult;
    }
    batchDepth += 1;
    try {
      return callback({
        actions: boundActions,
        getSnapshot,
        setState,
      });
    } finally {
      batchDepth -= 1;
      if (batchDepth === 0 && pendingNotification) {
        const notification = pendingNotification;
        pendingNotification = null;
        notify(notification.action, notification.previousState);
      }
    }
  }

  return Object.freeze({
    name,
    batch,
    getSnapshot,
    setState,
    subscribe,
    reset,
    actions: Object.freeze(boundActions),
  });
}
