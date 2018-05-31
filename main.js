// ------------------------------- Configuration -------------------------------

const ACTION_RULES = [{
  when: 'scans',
  create: [{
    property: { key: 'active', value: true }
  }]
}];

const PROPERTY_RULES = [{
  when: 'temperature_celsius > 100',
  create: [{
    property: { key: 'overheating', value: true }
  }]
}];


// ----------------------------------- Rules -----------------------------------

const validateRuleOutput = (output) => {
  return (output.action && output.action.type) ||
      (output.property && (output.property.key && (output.property.value !== undefined)));
};

const validateRule = (rule) => {
  if (rule.when && rule.create && rule.create.length &&
      rule.create.every(validateRuleOutput)) return;

  throw new Error(`Rule is invalid: ${JSON.stringify(rule)}`);
};

const createOutputs = (rule, thngId) => Promise.all(rule.create.map((item) => {
  if (item.action) return app.action(item.action.type).create(item.action);
  if (item.property) {
    if (!thngId) throw new Error(`Thng not specified, ${item.property.key} not updated.`);

    return app.thng(thngId).property().update([item.property]);
  }
}));

const runPropertyRule = (rule, propertyValue, thngId) => {
  const tokens = rule.when.split(' ');
  if (tokens.length !== 3) throw new Error('Invalid rule');

  // Determine decision
  const [key, operator, value] = tokens;
  const operators = {
    '>': n => n > value,
    '>=': n => n >= value,
    '==': n => n == value,
    '<': n => n < value,
    '<=': n => n <= value,
    includes: n => `${n}`.includes(value),
    '!=': n => n != value,
    is: n => `${n}` == value
  };

  if (!operators[operator]) throw new Error(`Invalid rule operator: ${operator}`);
  if (!operators[operator](propertyValue)) return Promise.resolve();

  // Process outputs
  return createOutputs(rule, thngId);
};

const checkPropertyRules = (event) => {
  const { changes, thng } = event;

  // For each rule, see if it changed
  return Promise.all(PROPERTY_RULES.map((rule) => {
    validateRule(rule);
    const changedKey = Object.keys(changes).find(item => rule.when.includes(item));
    if (!changedKey) return Promise.resolve();

    logger.info(`Running property rule ${rule.when}`);
    return runPropertyRule(rule, changes[changedKey].newValue, thng.id);
  }));
};

const checkActionRules = (event) => {
  const { action } = event;

  // For each action rule, find outputs if type matches
  return Promise.all(ACTION_RULES.map((rule) => {
    validateRule(rule);
    if (rule.when !== action.type) return Promise.resolve();

    // Run rule
    logger.info(`Running action rule ${rule.when}`);
    return createOutputs(rule, action.thng);
  }));
};


// ------------------------------- Reactor Events ------------------------------

const handle = (event, func) => {
  func(event)
    .catch(logger.error)
    .then(done);
};

function onActionCreated(event) {
  handle(event, checkActionRules);
}

function onThngPropertiesChanged(event) {
  handle(event, checkPropertyRules);
}
