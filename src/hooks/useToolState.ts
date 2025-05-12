import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseToolState, BaseToolProps } from '../components/tools/types';

interface UseToolStateProps extends BaseToolProps {
  initialState?: BaseToolState;
}

export function useToolState(props: UseToolStateProps) {
  const prevStateRef = useRef<BaseToolState | null>(null);
  
  // Initialize state with props.state or initialState, ensuring we preserve all existing state
  const [localState, setLocalState] = useState<BaseToolState>(() => {
    const initialState = props.state || props.initialState || {};
    const newState = {
      ...initialState,
      lastUpdated: Date.now()
    };
    prevStateRef.current = newState;
    return newState;
  });

  // Update local state when props.state changes
  useEffect(() => {
    if (props.state && JSON.stringify(props.state) !== JSON.stringify(prevStateRef.current)) {
      setLocalState(prevState => {
        const mergedState = {
          ...prevState,
          ...props.state,
          lastUpdated: Date.now()
        };
        prevStateRef.current = mergedState;
        return mergedState;
      });
    }
  }, [props.state]);

  // Update parent state when local state changes
  useEffect(() => {
    if (JSON.stringify(localState) !== JSON.stringify(prevStateRef.current)) {
      prevStateRef.current = localState;
      props.setState(localState);
    }
  }, [localState, props.setState]);

  // Function to update state
  const updateState = useCallback((newState: Partial<BaseToolState>) => {
    setLocalState(prevState => {
      const updatedState = {
        ...prevState,
        ...newState,
        lastUpdated: Date.now()
      };
      prevStateRef.current = updatedState;
      return updatedState;
    });
  }, []);

  // Function to get a specific state value
  const getStateValue = useCallback((key: string) => {
    return localState[key];
  }, [localState]);

  // Function to set a specific state value
  const setStateValue = useCallback((key: string, value: any) => {
    updateState({ [key]: value });
  }, [updateState]);

  return {
    state: localState,
    setState: updateState,
    getStateValue,
    setStateValue
  };
} 