
const agentEventMap = {};
agentEventMap['EVENT_AGENT_APP_CREATE'] = 'Medium';
agentEventMap['EVENT_AGENT_APP_START'] = 'Medium';
agentEventMap['EVENT_AGENT_APP_UPDATE_PASSWORD'] = 'High';
agentEventMap['EVENT_AGENT_APP_UPDATE_SETTINGS'] = 'Medium';
agentEventMap['EVENT_AGENT_APP_UPDATE_SCHEDULE'] = 'High';
agentEventMap['EVENT_AGENT_APP_DELETE'] = 'High';
agentEventMap['EVENT_AGENT_PARTNER_START'] = 'Medium';
agentEventMap['EVENT_AGENT_PARTNER_UPDATE_PASSWORD'] = 'High';
agentEventMap['EVENT_AGENT_PARTNER_UPDATE_SETTINGS'] = 'Medium';
agentEventMap['EVENT_AGENT_PARTNER_UPDATE_SCHEDULE'] = 'High';


const dfEventMap = {};
dfEventMap['EVENT_DF_CREATE'] = 'Medium';
dfEventMap['EVENT_DF_UPDATE'] = 'High';
dfEventMap['EVENT_DF_DELETE'] = 'High';


const flowEventMap = {};
flowEventMap['EVENT_FLOW_CREATE'] = 'Medium';
flowEventMap['EVENT_FLOW_UPDATE'] = 'High';
flowEventMap['EVENT_FLOW_START'] = 'Medium';
flowEventMap['EVENT_FLOW_STOP'] = 'High';
flowEventMap['EVENT_FLOW_DEPLOY'] = 'High';
flowEventMap['EVENT_FLOW_DELETE'] = 'High';


const processflowEventMap = {};
processflowEventMap['EVENT_PROCESS_FLOW_CREATE'] = 'Medium';
processflowEventMap['EVENT_PROCESS_FLOW_UPDATE'] = 'High';
processflowEventMap['EVENT_PROCESS_FLOW_START'] = 'Medium';
processflowEventMap['EVENT_PROCESS_FLOW_STOP'] = 'High';
processflowEventMap['EVENT_PROCESS_FLOW_DEPLOY'] = 'High';
processflowEventMap['EVENT_PROCESS_FLOW_REPAIR'] = 'High';
processflowEventMap['EVENT_PROCESS_FLOW_DELETE'] = 'High';
processflowEventMap['EVENT_PROCESS_FLOW_DELETE_DRAFT'] = 'High';


const processflowNodeEventMap = {};
processflowNodeEventMap['EVENT_PROCESS_FLOW_NODE_CREATE'] = 'Medium';
processflowNodeEventMap['EVENT_PROCESS_FLOW_NODE_UPDATE'] = 'High';
processflowNodeEventMap['EVENT_PROCESS_FLOW_NODE_DELETE'] = 'High';


function getAgentEventId(type, eventId) {
	if (type === 'PARTNERAGENT') {
		if (eventId === 'EVENT_AGENT_APP_UPDATE_PASSWORD') {
			return 'EVENT_AGENT_PARTNER_UPDATE_PASSWORD';
		}
		if (eventId === 'EVENT_AGENT_APP_UPDATE_SETTINGS') {
			return 'EVENT_AGENT_PARTNER_UPDATE_SETTINGS';
		}
		if (eventId === 'EVENT_AGENT_APP_UPDATE_SCHEDULE') {
			return 'EVENT_AGENT_PARTNER_UPDATE_SCHEDULE';
		}
		if (eventId === 'EVENT_AGENT_APP_START') {
			return 'EVENT_AGENT_PARTNER_START';
		}
		if (eventId === 'EVENT_AGENT_APP_CREATE') {
			return 'EVENT_AGENT_PARTNER_CREATE';
		}
	}
	if (!eventId) {
		return 'EVENT_AGENT_APP_CREATE';
	}
	return eventId;
}


function getAgentEventPriority(eventId) {
	return agentEventMap[eventId];
}


function getDFEventPriority(eventId) {
	return dfEventMap[eventId];
}


function getFlowEventPriority(eventId) {
	return flowEventMap[eventId];
}


function getProcessFlowEventPriority(eventId) {
	return processflowEventMap[eventId];
}


function getProcessFlowNodeEventPriority(eventId) {
	return processflowNodeEventMap[eventId];
}


module.exports.getAgentEventId = getAgentEventId;
module.exports.getAgentEventPriority = getAgentEventPriority;

module.exports.getDFEventPriority = getDFEventPriority;
module.exports.getFlowEventPriority = getFlowEventPriority;

module.exports.getProcessFlowEventPriority = getProcessFlowEventPriority;
module.exports.getProcessFlowNodeEventPriority = getProcessFlowNodeEventPriority;
