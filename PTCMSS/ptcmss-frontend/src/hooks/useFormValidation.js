import { useState, useCallback } from 'react';
import { validateForm, hasErrors as checkHasErrors } from '../utils/validation';

/**
 * Custom hook for form validation
 *
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} - Form state and handlers
 *
 * Example usage:
 * const { values, errors, handleChange, handleBlur, validateAll, resetForm } = useFormValidation(
 *   { email: '', phone: '' },
 *   {
 *     email: [validateRequired, validateEmail],
 *     phone: [validateRequired, validatePhone]
 *   }
 * );
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Handle input change
    const handleChange = useCallback((field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [errors]);

    // Handle input blur (validate on blur)
    const handleBlur = useCallback((field) => {
        setTouched(prev => ({ ...prev, [field]: true }));

        // Validate this field
        if (validationRules[field]) {
            const validators = Array.isArray(validationRules[field])
                ? validationRules[field]
                : [validationRules[field]];

            for (const validator of validators) {
                const error = validator(values[field], field);
                if (error) {
                    setErrors(prev => ({ ...prev, [field]: error }));
                    return;
                }
            }

            // Clear error if validation passes
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    }, [values, validationRules]);

    // Validate all fields
    const validateAll = useCallback(() => {
        const newErrors = validateForm(values, validationRules);
        setErrors(newErrors);

        // Mark all fields as touched
        const allTouched = {};
        Object.keys(validationRules).forEach(field => {
            allTouched[field] = true;
        });
        setTouched(allTouched);

        return !checkHasErrors(newErrors);
    }, [values, validationRules]);

    // Reset form
    const resetForm = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    // Set specific field value
    const setValue = useCallback((field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
    }, []);

    // Set specific field error
    const setError = useCallback((field, error) => {
        setErrors(prev => ({ ...prev, [field]: error }));
    }, []);

    // Check if form is valid
    const isValid = !checkHasErrors(errors);

    // Check if form has been modified
    const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

    return {
        values,
        errors,
        touched,
        isValid,
        isDirty,
        handleChange,
        handleBlur,
        validateAll,
        resetForm,
        setValue,
        setError,
        setValues,
        setErrors,
    };
};