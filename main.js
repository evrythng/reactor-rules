const runAsync = require('reactor-runasync');

// ------------------------------- Configuration -------------------------------

/** Configured rules for actions created. */
const ACTION_RULES = [{
  when: action => action.type === '_LeftWarehouse',
  create: action => ({ key: 'in_transit', value: true }),
}, {
  when: action => action.type === '_ArrivedAtDestination',
  create: action => ({ key: 'in_transit', value: false }),
}];

/** Configured rules for properties updated. */
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


// ----------------------------------- Rules -----------------------------------

/**
 * Determine if a value is an action.
 *
 * @param {Object} value - The value to assess.
 * @returns {boolean} true if the value looks like an action.
 */
const isAction = value => value.type !== undefined;

/**
 * Determine if a value is a property update.
 *
 * @param {Object} value - The value to assess.
 * @returns {boolean} true if the value looks like a property update.
 */
const isPropertyUpdate = value => value.key && value.value !== undefined;

/**
 * Create the ouput resource on the Thng (property update or action)
 *
 * @param {string} thngId - ID of the Thng to use.
 * @param {Object} payload - The output object payload
 * @returns {Promise}
 */
const createOutput = (thngId, payload) => {
  if (isAction(payload)) {
    return app.thng(thngId).action(payload.type).create(payload);
  }
  if (isPropertyUpdate(payload)) {
    return app.thng(thngId).property().update(payload);
  }

  throw new Error('Payload is neither action or property update');
};

/**
 * Validate a rule is set up correctly.
 *
 * @param {Object} rule - Rule item from the configuration at the top of the script.
 */
const validateRule = (rule) => {
  if (rule.when && rule.create && typeof rule.create === 'function') {
    return;
  }

  throw new Error(`Rule is invalid: ${JSON.stringify(rule)}`);
};

/**
 * Check which property update rules apply, if any.
 *
 * @param {Object} event - Event that occurred.
 */
const checkPropertyRules = (event) => {
  const { changes, thng } = event;

  // For each rule, see if it changed
  return Promise.all(PROPERTY_RULES.map((rule) => {
    validateRule(rule);

    const changedKey = Object.keys(changes).find(item => rule.when(item, changes[item].newValue));
    if (!changedKey) {
      return;
    }

    logger.info(`Running property rule ${rule.when} on ${thng.id}`);
    return createOutput(thng.id, rule.create(changedKey, changes[changedKey].newValue));
  }));
};

/**
 * Check which action rules to apply, if any.
 *
 * @param {Object} event - Event that occurred.
 */
const checkActionRules = (event) => {
  const { action } = event;

  // For each action rule, find outputs if type matches
  return Promise.all(ACTION_RULES.map((rule) => {
    validateRule(rule);

    if (!rule.when(action)) {
      return;
    }
    if (!action.thng) {
      throw new Error('Rule matched but action did not contain a Thng ID');
    }

    logger.info(`Running action rule ${rule.when} on ${action.thng}`);
    return createOutput(action.thng, rule.create(action));
  }));
};


// ------------------------------- Reactor Events ------------------------------

const onActionCreated = event => runAsync(() => checkActionRules(event));

const onThngPropertiesChanged = event => runAsync(() => checkPropertyRules(event));
