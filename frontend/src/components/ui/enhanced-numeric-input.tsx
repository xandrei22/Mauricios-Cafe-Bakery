import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedNumericInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowDecimals?: boolean;
  incrementStep?: number; // Step for +/- buttons (defaults to 1)
}

export const EnhancedNumericInput: React.FC<EnhancedNumericInputProps> = ({
  id,
  value,
  onChange,
  min = 0,
  max,
  step = 0.001,
  placeholder,
  className,
  disabled = false,
  allowDecimals = true,
  incrementStep = 1, // Default increment step is 1 (integer)
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  // Update input value when prop value changes (but not when focused to avoid interrupting typing)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow empty string for easier editing
    if (newValue === '') {
      setInputValue('');
      return;
    }

    // Validate input based on allowDecimals setting
    if (allowDecimals) {
      // Allow decimals - validate with regex for decimal numbers
      if (/^\d*\.?\d*$/.test(newValue)) {
        setInputValue(newValue);
      }
    } else {
      // Only allow integers
      if (/^\d*$/.test(newValue)) {
        setInputValue(newValue);
      }
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    
    // Parse and validate the final value
    let numericValue = parseFloat(inputValue);
    
    // Handle empty or invalid input
    if (isNaN(numericValue) || inputValue === '') {
      numericValue = min || 0;
    }
    
    // Apply min/max constraints
    if (min !== undefined && numericValue < min) {
      numericValue = min;
    }
    if (max !== undefined && numericValue > max) {
      numericValue = max;
    }
    
    // Round to appropriate decimal places if not allowing decimals
    if (!allowDecimals) {
      numericValue = Math.round(numericValue);
    }
    
    // Update both local state and parent
    setInputValue(numericValue.toString());
    onChange(numericValue);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
    if ([8, 9, 27, 13, 35, 36, 37, 39, 38, 40].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        (e.keyCode === 90 && e.ctrlKey === true)) {
      return;
    }
    
    // Ensure that it is a number or decimal point and stop the keypress
    if (allowDecimals) {
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
          (e.keyCode < 96 || e.keyCode > 105) && 
          e.keyCode !== 190 && e.keyCode !== 110) {
        e.preventDefault();
      }
    } else {
      // Only allow numbers for integer-only inputs
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && 
          (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    }
  };

  const increment = () => {
    if (disabled) return;
    
    const currentValue = parseFloat(inputValue) || 0;
    let newValue = currentValue + incrementStep;
    
    // Apply max constraint
    if (max !== undefined && newValue > max) {
      newValue = max;
    }
    
    setInputValue(newValue.toString());
    onChange(newValue);
  };

  const decrement = () => {
    if (disabled) return;
    
    const currentValue = parseFloat(inputValue) || 0;
    let newValue = currentValue - incrementStep;
    
    // Apply min constraint
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    
    setInputValue(newValue.toString());
    onChange(newValue);
  };

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={decrement}
        disabled={disabled || (min !== undefined && parseFloat(inputValue) <= min)}
        className="rounded-r-none px-2 h-10 border-r-0"
      >
        <Minus className="w-4 h-4" />
      </Button>
      
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-none text-center border-x-0 focus:border-x focus:z-10"
        style={{ 
          MozAppearance: 'textfield',
          WebkitAppearance: 'none'
        }}
      />
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={increment}
        disabled={disabled || (max !== undefined && parseFloat(inputValue) >= max)}
        className="rounded-l-none px-2 h-10 border-l-0"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default EnhancedNumericInput;
