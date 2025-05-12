// Base interface for all tool states
export interface BaseToolState {
  // Common state properties that all tools might need
  lastUpdated?: number;
  [key: string]: any;
}

// Props interface that all tool components should implement
export interface BaseToolProps {
  state: BaseToolState;
  setState: (newState: Partial<BaseToolState>) => void;
}

// Type for tool component
export type ToolComponent = React.FC<BaseToolProps>;

// Helper type for creating tool state interfaces
export type ToolState<T> = T & BaseToolState; 