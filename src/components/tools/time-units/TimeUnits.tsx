import React from 'react';
import { BaseToolProps, ToolState } from '../types';
import { useToolState } from '../../../hooks/useToolState';

interface TimeUnitsState {
  input: string;
  output: string;
  fromUnit: string;
  toUnit: string;
  value: number;
}

const TIME_UNITS = {
  milliseconds: 1,
  seconds: 1000,
  minutes: 60000,
  hours: 3600000,
  days: 86400000,
  weeks: 604800000,
  months: 2592000000,
  years: 31536000000
};

export const TimeUnits: React.FC<BaseToolProps<ToolState<TimeUnitsState>>> = (props) => {
  const { state, updateState } = useToolState<ToolState<TimeUnitsState>>({
    input: '',
    output: '',
    fromUnit: 'milliseconds',
    toUnit: 'seconds',
    value: 0
  }, props);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    updateState({ input });
    
    const value = parseFloat(input);
    if (!isNaN(value)) {
      updateState({ value });
      convertTime(value, state.fromUnit, state.toUnit);
    }
  };

  const handleFromUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fromUnit = e.target.value;
    updateState({ fromUnit });
    convertTime(state.value, fromUnit, state.toUnit);
  };

  const handleToUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const toUnit = e.target.value;
    updateState({ toUnit });
    convertTime(state.value, state.fromUnit, toUnit);
  };

  const convertTime = (value: number, fromUnit: string, toUnit: string) => {
    const milliseconds = value * TIME_UNITS[fromUnit as keyof typeof TIME_UNITS];
    const result = milliseconds / TIME_UNITS[toUnit as keyof typeof TIME_UNITS];
    updateState({ output: result.toFixed(6) });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white">Time Unit Converter</h2>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              From Unit
            </label>
            <select
              id="fromUnit"
              value={state.fromUnit}
              onChange={handleFromUnitChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              {Object.keys(TIME_UNITS).map(unit => (
                <option key={unit} value={unit}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              To Unit
            </label>
            <select
              id="toUnit"
              value={state.toUnit}
              onChange={handleToUnitChange}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              {Object.keys(TIME_UNITS).map(unit => (
                <option key={unit} value={unit}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Value
          </label>
          <input
            type="number"
            id="input"
            value={state.input}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            placeholder="Enter value to convert..."
          />
        </div>

        <div>
          <label htmlFor="output" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Result
          </label>
          <input
            type="text"
            id="output"
            value={state.output}
            readOnly
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm bg-gray-50 dark:bg-gray-800"
            placeholder="Converted value will appear here..."
          />
        </div>
      </div>
    </div>
  );
}; 