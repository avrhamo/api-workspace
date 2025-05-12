import React from 'react';
import { BaseToolProps } from '../types';
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

const TimeUnits: React.FC<BaseToolProps> = ({ state, setState }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const newState = { ...state, input };
    
    const value = parseFloat(input);
    if (!isNaN(value)) {
      newState.value = value;
      convertTime(value, state.fromUnit || 'milliseconds', state.toUnit || 'seconds', newState);
    }
    
    setState(newState);
  };

  const handleFromUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fromUnit = e.target.value;
    const newState = { ...state, fromUnit };
    convertTime(state.value || 0, fromUnit, state.toUnit || 'seconds', newState);
    setState(newState);
  };

  const handleToUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const toUnit = e.target.value;
    const newState = { ...state, toUnit };
    convertTime(state.value || 0, state.fromUnit || 'milliseconds', toUnit, newState);
    setState(newState);
  };

  const convertTime = (value: number, fromUnit: string, toUnit: string, newState: Partial<TimeUnitsState>) => {
    const milliseconds = value * TIME_UNITS[fromUnit as keyof typeof TIME_UNITS];
    const result = milliseconds / TIME_UNITS[toUnit as keyof typeof TIME_UNITS];
    newState.output = result.toFixed(6);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-2xl font-semibold mb-4">Time Units Converter</h2>
      <div className="flex flex-col space-y-4">
        <div>
          <label htmlFor="input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Value
          </label>
          <input
            type="number"
            id="input"
            value={state.input || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter a number"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From
            </label>
            <select
              id="fromUnit"
              value={state.fromUnit || 'milliseconds'}
              onChange={handleFromUnitChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.keys(TIME_UNITS).map(unit => (
                <option key={unit} value={unit}>
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To
            </label>
            <select
              id="toUnit"
              value={state.toUnit || 'seconds'}
              onChange={handleToUnitChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label htmlFor="output" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Result
          </label>
          <input
            type="text"
            id="output"
            value={state.output || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeUnits;