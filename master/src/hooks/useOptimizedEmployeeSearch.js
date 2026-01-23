import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Custom hook for optimized employee search with debouncing and performance optimizations
 * @param {Array} allEmployees - Complete list of employees
 * @param {number} maxOptions - Maximum number of options to display (default: 100)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns {Object} - Search state and handlers
 */
export const useOptimizedEmployeeSearch = (allEmployees = [], maxOptions = 100, debounceMs = 300) => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(searchInput);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchInput, debounceMs]);

  // Memoized filtered options with limit
  const filteredOptions = useMemo(() => {
    if (!debouncedInput || debouncedInput.trim() === "") {
      return [];
    }
    
    const searchLower = debouncedInput.toLowerCase();
    const filtered = [];
    
    // Early termination for performance
    for (let i = 0; i < allEmployees.length && filtered.length < maxOptions; i++) {
      if (allEmployees[i].label && allEmployees[i].label.toLowerCase().includes(searchLower)) {
        filtered.push(allEmployees[i]);
      }
    }
    
    return filtered;
  }, [debouncedInput, allEmployees, maxOptions]);

  // Handler for search input change
  const handleSearchInputChange = useCallback((val) => {
    setSearchInput(val);
  }, []);

  // Custom no options message
  const noOptionsMessage = useCallback(() => {
    if (!debouncedInput || debouncedInput.trim() === "") {
      return "Type to search employees...";
    }
    return filteredOptions.length >= maxOptions
      ? `Showing first ${maxOptions} results. Type more to refine search.`
      : "No employees found";
  }, [debouncedInput, filteredOptions.length, maxOptions]);

  // Get selected employee from all employees
  const getSelectedEmployee = useCallback((employeeId) => {
    if (!employeeId) return null;
    return allEmployees.find((opt) => opt.value === employeeId) || null;
  }, [allEmployees]);

  return {
    searchInput,
    debouncedInput,
    filteredOptions,
    handleSearchInputChange,
    noOptionsMessage,
    getSelectedEmployee
  };
};

export default useOptimizedEmployeeSearch;
