export function buildGlossaryFeatureMountPayload({
  ports,
  workflowPorts,
} = {}) {
  return {
    apiPrefix: ports.apiPrefix,
    fetchGlossaries: ports.fetchGlossaries,
    fetchGlossary: ports.fetchGlossary,
    createGlossary: ports.createGlossary,
    updateGlossary: ports.updateGlossary,
    deleteGlossary: ports.deleteGlossary,
    exportGlossaryCsv: ports.exportGlossaryCsv,
    parseGlossaryCsv: ports.parseGlossaryCsv,
    refreshWorkflowGlossaries: workflowPorts.loadGlossaryOptions,
  };
}
