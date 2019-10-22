# reactor-rules

A reusable Reactor script allowing creation of Thng property updates and actions
in response to Thng property updates and actions on Thngs. This can be used to
automate Thng property updates and values according to simple rules.


## How Rules Work

Rules have two main fields:

* `when` - an expression that will return `true` if the rule is to be run.

* `create` - an expression returning an output object that will be created when
  the rule is run. This can be either an action or a property update.

The `action` or property update `key` and `value` that triggered the script is
provided so it can inform the rule and be used to create the output action or
property update. For example - when a property reaches a threshold, create an
action with the new value as a `customField`.


## Types of Rules

There are two kinds of rule available with this script:

**Action Created**

When an action is created in scope of the project, the outputs include creating
other actions or updating the same Thng's properties.

Example: `when: action => action.type === '_LeftWarehouse',`

**Property Created/Updated**

When a Thng's properties are created or updated, the outputs include creating
actions or updating the same Thng's properties.

Example: `when: (key, value) => key === 'temperature_celsius' && value >= 100`


## Installation

1. Open the [Dashboard](https://dashboard.evrythng.com) and create a project and
   application.
2. Paste `main.js` into the application's Reactor script field.
3. Click 'Show dependencies' and set the `dependencies` to those in
   `package.json`.
4. Save the new script with the 'Update' button.


## Configuration

After installing the Reactor script, choose some rules according to the
description above by configuring the `ACTION_RULES` and `PROPERTY_RULES` arrays
in the script body.

The following is an example rule configuration that can be placed at the top
of `main.js`:

```js
const ACTION_RULES = [{
  when: action => action.type === '_LeftWarehouse',
  create: action => ({ key: 'in_transit', value: true }),
}, {
  when: action => action.type === '_ArrivedAtDestination',
  create: action => ({ key: 'in_transit', value: false }),
}];

const PROPERTY_RULES = [{
  when: (key, value) => key === 'temperature_celsius' && value >= 100,
  create: () => ({ key: 'overheating', value: true }),
}, {
  when: (key, value) => key === 'temperature_celsius' && value < 100,
  create: () => ({ key: 'overheating', value: false }),
}, {
  when: (key, value) => key === 'weather_report' && value.includes('rain'),
  create: (key, value) => ({
    type: '_ForecastAlert',
    customFields: { conditions: value },
  }),
}];
```


## Usage

Create actions or update properties on Thngs that match the rules you have
configured. You should observe the outputs being created as configured, or an
error if the rule is not valid or some other problem occurred.
