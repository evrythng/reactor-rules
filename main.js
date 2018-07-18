// ------------------------------- Configuration -------------------------------

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


// ----------------------------------- Rules -----------------------------------

const isAction = value => value.type && value.type.startsWith('_');

const isPropertyUpdate = value => value.key && value.value !== undefined;

const createOutput = (thngId, payload) => {
  if (isAction(payload)) return app.thng(thngId).action(payload.type).create(payload);  
  if (isPropertyUpdate(payload)) return app.thng(thngId).property().update(payload);
  
  throw new Error('Payload is neither action or property update');
};

const validateRule = (rule) => {
  if (rule.when && rule.create && typeof rule.create === 'function') return;

  throw new Error(`Rule is invalid: ${JSON.stringify(rule)}`);
};

const checkPropertyRules = (event) => {
  const { changes, thng } = event;

  // For each rule, see if it changed
  return Promise.all(PROPERTY_RULES.map((rule) => {
    validateRule(rule);
    const changedKey = Object.keys(changes).find(item => rule.when(item, changes[item].newValue));
    if (!changedKey) return Promise.resolve();

    logger.info(`Running property rule ${rule.when} on ${thng.id}`);
    return createOutput(thng.id, rule.create(changedKey, changes[changedKey].newValue));
  }));
};

const checkActionRules = (event) => {
  const { action } = event;

  // For each action rule, find outputs if type matches
  return Promise.all(ACTION_RULES.map((rule) => {
    validateRule(rule);
    if (!rule.when(action)) return Promise.resolve();
    if (!action.thng) throw new Error('Rule matched but action did not contain a Thng ID');

    logger.info(`Running action rule ${rule.when} on ${action.thng}`);
    return createOutput(action.thng, rule.create(action));
  }));
};


// ------------------------------- Reactor Events ------------------------------

const handleError = err => logger.error(err.message || err.errors[0]);

const handleEvent = (event, handler) => {
  handler(event)
    .catch(handleError)
    .then(done);
};

function onActionCreated(event) {
  handleEvent(event, checkActionRules);
}

function onThngPropertiesChanged(event) {
  handleEvent(event, checkPropertyRules);
}