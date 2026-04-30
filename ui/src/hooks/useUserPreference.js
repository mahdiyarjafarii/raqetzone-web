import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "@/lib/apiClient";
import authStorage from "@/auth/storage";

// Cache for preferences to avoid redundant API calls
const preferenceCache = new Map();

// Track in-flight batch requests to prevent duplicates
let pendingBatchRequest = null;

/**
 * Hook to manage user preferences stored in Redis on the backend
 * 
 * @param {string} key - The preference key (e.g., 'show-onboarding', 'usage-hint', 'gem-hint')
 * @param {any} defaultValue - Default value when preference doesn't exist
 * @returns {[any, (value: any) => Promise<void>, boolean]} - [value, setValue, isLoading]
 * 
 * @example
 * const [showOnboarding, setShowOnboarding, isLoading] = useUserPreference('show-onboarding', true);
 */
export function useUserPreference(key, defaultValue = true) {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const initialFetchDone = useRef(false);

  // Fetch preference from backend on mount
  useEffect(() => {
    fetchPreference();
  }, [key, defaultValue]);

  // Function to update preference value
  const setPreference = useCallback(async (newValue) => {
    // Update local state immediately for responsive UI
    setValue(newValue);
    preferenceCache.set(key, newValue);

    // Skip API call if not logged in
    const token = authStorage.getToken();
    if (!token) return;

    try {
      await apiClient.post(`/preference/${key}`, { value: newValue });
    } catch (error) {
      console.error(`Error setting preference ${key}:`, error);
      // Don't revert - keep the local state for better UX
    }
  }, [key]);

  const fetchPreference = async () => {
    // Skip if not logged in
    const token = authStorage.getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (preferenceCache.has(key)) {
      setValue(preferenceCache.get(key));
      setIsLoading(false);
      initialFetchDone.current = true;
      return;
    }

    try {
      const { data, ok } = await apiClient.get(`/preference/${key}`);
      
      if (ok && data.exists) {
        setValue(data.value);
        preferenceCache.set(key, data.value);
      } else {
        // If preference doesn't exist, use default value
        setValue(defaultValue);
        preferenceCache.set(key, defaultValue);
      }
    } catch (error) {
      console.error(`Error fetching preference ${key}:`, error);
      // On error, use default value
      setValue(defaultValue);
    } finally {
      setIsLoading(false);
      initialFetchDone.current = true;
    }
  };

  return [value, setPreference, isLoading];
}

/**
 * Fetch multiple preferences at once (useful for initial load)
 * Deduplicates in-flight requests to prevent double-fetching in React StrictMode
 * 
 * @param {string[]} keys - Array of preference keys
 * @returns {Promise<Object>} - Object with preference values keyed by their keys
 * 
 * @example
 * const prefs = await fetchBatchPreferences(['show-onboarding', 'usage-hint', 'gem-hint']);
 * // { 'show-onboarding': true, 'usage-hint': false, 'gem-hint': true }
 */
export async function fetchBatchPreferences(keys) {
  const token = authStorage.getToken();
  if (!token) {
    // Return defaults (all true) for non-logged-in users
    return keys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
  }

  // Check if all keys are already cached
  const allCached = keys.every(key => preferenceCache.has(key));
  if (allCached) {
    return keys.reduce((acc, key) => ({ ...acc, [key]: preferenceCache.get(key) }), {});
  }

  // If there's already a pending request, return that promise to avoid duplicates
  if (pendingBatchRequest) return pendingBatchRequest;

  // Create the request and store it
  pendingBatchRequest = (async () => {
    try {
      const { data, ok } = await apiClient.post('/preferences/batch', { keys });
      
      if (ok && data.preferences) {
        const results = {};
        keys.forEach(key => {
          const pref = data.preferences[key];
          const value = pref?.exists ? pref.value : true; // default to true if not exists
          results[key] = value;
          preferenceCache.set(key, value);
        });
        return results;
      }
    } catch (error) {
      console.error('Error fetching batch preferences:', error);
    } finally {
      // Clear the pending request after it completes
      pendingBatchRequest = null;
    }

    // Return defaults on error
    return keys.reduce((acc, key) => ({ ...acc, [key]: true }), {});
  })();

  return pendingBatchRequest;
}

/**
 * Clear the preference cache (useful on logout)
 */
export function clearPreferenceCache() {
  preferenceCache.clear();
  pendingBatchRequest = null;
}

export default useUserPreference;
