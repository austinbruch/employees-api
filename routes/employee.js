'use strict';

const express = require('express');
const router = express.Router();
const uuid = require('uuid').v4;

const DATABASE = {
  [uuid()]: {
    firstName: 'asf',
    lastName: 'asdf',
    hireDate: '2020-02-29',
    role: 'CEO'
  }
};

/* GET employees listing. */
router.get('', function(req, res) {
  // Map the database object to an array for the API response
  return res.send(Object.keys(DATABASE).map((id) => ({
    ...DATABASE[id],
    _id: id
  })));
});

router.post('', (req, res) => {
  const newEmp = req.body;

  const fieldValidations = [
    {
      fieldName: 'firstName',
      options: {
        dataType: 'string'
      }
    },
    {
      fieldName: 'lastName',
      options: {
        dataType: 'string'
      }
    },
    {
      fieldName: 'hireDate',
      options: {
        dataType: 'string',
        custom: () => undefined // TODO - this is where we need to validate the date format, and that the date is in the past
      }
    },
    {
      fieldName: 'role',
      options: {
        dataType: 'string',
        allowedValues: ['CEO', 'VP', 'MANAGER', 'LACKEY'],
        custom: () => undefined // TODO - this is where we need to enforce uniqueness on the CEO role
      }
    }
  ];

  for (let i = 0; i < fieldValidations.length; i++) {
    const isInvalid = validateField(newEmp, fieldValidations[i].fieldName, fieldValidations[i].options);
    if (isInvalid) {
      res.status(400).send({
        result: isInvalid
      });
      return;
    }
  }

  // Assuming we got this far, we're all good on validations
  let newId = uuid();
  DATABASE[newId] = {
    firstName: newEmp.firstName,
    lastName: newEmp.lastName,
    hireDate: newEmp.hireDate,
    role: newEmp.role
  };
  // TODO still need to add the 2 externally-populated fields
  // while (!DATABASE.hasOwnProperty(newId)) {
  // }
  res.sendStatus(201);
});

/**
 * Validates the specified field in the given object, with configurable options.
 * @param {*} obj The object that contains the field/property to be validated
 * @param {*} fieldName The name of the field to validate
 * @param {*} options Object for customization of validation approach
 * `options.dataType` - specifies the required data type for the value of the given field.
 * `options.allowedValues` - specifies an array that represents an enum of values allowed for the given field.
 * `options.custom` - specifies a custom callback function to perform highly specific validation.
 * The callback function receives the `fieldName` and the value of the field. It should return
 * a string to be used as an error response, if the value is invalid, `undefined` otherwise.
 * @returns string | undefined - string if the object is invalid (the return value is an error message), undefined otherwise.
 */
const validateField = (obj, fieldName, options) => {
  const existence = validateFieldExistence(obj, fieldName);
  if (existence) {
    return existence;
  }

  if (options.dataType) {
    const dataType = validateFieldType(obj, fieldName, options.dataType);
    if (dataType) {
      return dataType;
    }
  }

  if (options.allowedValues) {
    const allowedValues = validateFieldValueEnum(obj, fieldName, options.allowedValues);
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

const validateFieldValueEnum = (obj, fieldName, allowedValues) => {
  if (allowedValues.indexOf(obj[fieldName]) === -1) {
    return `The value of property [${fieldName}] is invalid. It should be one of ${allowedValues.join(', ')}.`;
  }
};

module.exports = router;
