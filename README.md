# reactor-rules

A reusable Reactor script allowing creation of Thng property updates and actions
in response to Thng property updates and actions on Thngs. This can be used to
automate Thng property updates and values according to simple arithmetic
criteria.


## How Rules Work

Rules have two main fields:

* `when` - the criteria that will activate the rule.

* `create` - an array of outputs that will be created when the rule activated.

There are two kinds of rule available with this script:

**Action Created**

When an action is created in scope of the project, the outputs include creating
other actions or updating the same Thng's properties. The `when` condition must
be an action type, such as `scans`.

Example: `when: '_LeftWarehouse'`

**Property Created/Updated**

When a Thng's properties are created or updated, the outputs include creating
actions or updating the same Thng's properties. The `when` condition must be a
simple expression describing a state of the property value, such as
`temperature_celsius > 100`. Available operators are '>', '>=', '==', '<', '<=',
'includes', '!=', 'is'.

Example: `temperature_celsius >= 100`


## Installation

1. Open the [Dashboard](https://dashboard.evrythng.com) and create a project and
   application.
2. Paste `main.js` into the application's Reactor script field.
3. Click 'Show dependencies' and set the `dependencies` in `package.json`.
5. Save the new script with the 'Update' button.


## Configuration

After installing the Reactor script, choose some rules according to the
description above by configuring the `ACTION_RULES` and `PROPERTY_RULES` arrays
in the script body.

The following is an example rule configuration that would be placed at the top
of `main.js`:

```js
const ACTION_RULES = [{
  when: '_LeftWarehouse',
  create: [{
    property: { key: 'in_transit', value: true }
  }]
}, {
  when: '_ArrivedAtDestination',
  create: [{
    property: { key: 'in_transit', value: false }
  }]
}];

const PROPERTY_RULES = [{
  when: 'temperature_celsius >= 100',
  create: [{
    property: { key: 'overheating', value: true }
  }]
}, {
  when: 'temperature_celsius < 100',
  create: [{
    property: { key: 'overheating', value: false }
  }]
}, {
  when: 'weather_report includes rain',
  create: [{
    action: { type: '_ForecastAlert', tags: ['rain'] }
  }]
}];
```


## Usage

Create actions or update properties on Thngs that match the rules you have
configured. You should observe the outputs being created as configured, or an
error if the rule is not valid.
