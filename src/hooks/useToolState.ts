import { useCallback } from 'react';
import { BaseToolState, BaseToolProps } from '../components/tools/types';

// No initialState prop needed here anymore if App.tsx handles defaults.
// interface UseToolStateProps extends BaseToolProps {} // props already has state & setState

export function useToolState(props: BaseToolProps) {
  const { state: stateFromParent, setState: setParentState } = props;

  // The state is directly from the parent (App.tsx)
  // No internal useState or useEffect for synchronization needed here.

  const updateState = useCallback((newStateUpdate: Partial<BaseToolState>) => {
    // The tool wants to update its state.
    // We tell App.tsx to merge this partial update.
    // App.tsx's handleToolStateChange is responsible for the actual merge.
    // It will create a new state object in App.tsx.
    setParentState(newStateUpdate); // Pass the PARTIAL update
  }, [setParentState]); // setParentState from App.tsx should be stable

  // getStateValue and setStateValue might need adjustment if we no longer
  // have a 'localState' that's guaranteed to be an object.
  // However, stateFromParent should always be an object if App.tsx manages it well.
  const getStateValue = useCallback((key: string) => {
    return stateFromParent ? stateFromParent[key] : undefined;
  }, [stateFromParent]);

  const setStateValue = useCallback((key: string, value: any) => {
    // This creates a partial update object { [key]: value }
    updateState({ [key]: value });
  }, [updateState]);

  return {
    state: stateFromParent || {}, // Provide the state from parent, or an empty object if undefined
    setState: updateState,     // This will call App.tsx's merger
    getStateValue,
    setStateValue,
  };
} 