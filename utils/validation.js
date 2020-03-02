/**
 * Validates the specified field in the given object, with configurable options.
 * @param {*} obj The object that contains the field/property to be validated
 * @param {*} fieldName The name of the field to validate
 * @param {*} options Object for customization of validation approach
 * `options.dataType` - specifies the required data type for the value of the given field.
 * `options.allowedValues` - specifies an array that represents an enum of values allowed for the given field.
 * `options.allowedValuesCaseSensitive` - specifies whether the values in `options.allowedValues` are to be case sensitive. Only applicable to strings. Defaults to true if omitted.
 * `options.custom` - specifies a custom callback function to perform highly specific validation.
 * `options.reqMethod` - specifes the HTTP request method used in the current flow
 * `options.required` - object that defined whether the field is required for a given HTTP method. All are true if omitted.
 * `options.required.post` - boolean that specifies whether the field is required for a HTTP POST request. True if omitted
 * `options.required.put` - boolean that specifies whether the field is required for a HTTP PUT request. True if omitted
 * The callback function receives the `fieldName` and the value of the field. It should return
 * a string to be used as an error response, if the value is invalid, `undefined` otherwise.
 * @returns string | undefined - string if the object is invalid (the return value is an error message), undefined otherwise.
 */
const validateField = (obj, fieldName, options) => {
    let isRequired = true;
    if (options.required && options.reqMethod) {
        if (options.required.hasOwnProperty(options.reqMethod.toLowerCase())) {
            isRequired = options.required[options.reqMethod.toLowerCase()];
        }
    }

    const existence = validateFieldExistence(obj, fieldName);
    if (isRequired && existence) {
        // If the field is required and it's missing, return the error.
        return existence;
    } else if (!isRequired && existence) {
        // If it's not required and it's not present, return immediately to skip all further validation.
        return;
    }

    if (options.dataType) {
        const dataType = validateFieldType(obj, fieldName, options.dataType);
        if (dataType) {
            return dataType;
        }
    }

    if (options.allowedValues) {
        const caseSensitive = options.hasOwnProperty('allowedValuesCaseSensitive') ? options.allowedValuesCaseSensitive : true;
        const allowedValues = validateFieldValueEnum(obj, fieldName, options.allowedValues, caseSensitive);
        if (allowedValues) {
            return allowedValues;
        }
    }

    if (options.custom) {
        const custom = options.custom(fieldName, obj[fieldName]);
        if (custom) {
            return custom;
        }
    }
};

const validateFieldExistence = (obj, fieldName) => {
    if (!obj.hasOwnProperty(fieldName)) {
        return `Required property [${fieldName}] is missing from the request payload.`;
    }
};

const validateFieldType = (obj, fieldName, dataType) => {
    if (typeof obj[fieldName] !== dataType) {
        return `The value of property [${fieldName}] is not the correct data type. It should be [${dataType}].`;
    }
};

const validateFieldValueEnum = (obj, fieldName, allowedValues, caseSensitive) => {
    let updatedAllowedValues = allowedValues;
    let updatedFieldValue = obj[fieldName];

    // If case insensitive matching, convert all strings to lowercase
    if (!caseSensitive) {
        updatedAllowedValues = allowedValues.map((allowedValue) => {
            if (typeof allowedValue === 'string') {
                return allowedValue.toLowerCase();
            } else {
                return allowedValue;
            }
        });

        if (typeof updatedFieldValue === 'string') {
            updatedFieldValue = updatedFieldValue.toLowerCase();
        }
    }

    if (updatedAllowedValues.indexOf(updatedFieldValue) === -1) {
        return `The value of property [${fieldName}] is invalid. It should be one of ${allowedValues.join(', ')}.`;
    }
};

module.exports = validateField;