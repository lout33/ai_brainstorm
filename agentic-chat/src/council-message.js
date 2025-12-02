// Council Message Renderer
// Renders rich council results in the agent chat panel

/**
 * Render a council result as HTML for display in agent messages
 *
 * @param {Object} result - Council result from runCouncil()
 * @param {Array} result.rankings - Rankings from each model
 * @param {Object} result.labelToModel - Label to model mapping
 * @param {Array} result.aggregateRankings - Calculated aggregate rankings
 * @param {Object} result.synthesis - Chairman synthesis result
 * @returns {string} HTML string
 */
export function renderCouncilMessage(result) {
  const { rankings = [], labelToModel = {}, aggregateRankings = [], synthesis = {} } = result || {};

  // Build rankings table
  const rankingsTableRows = (rankings || []).map(r => {
    const parsedRanking = r.parsedRanking || [];
    const parsedStr = parsedRanking.length > 0
      ? parsedRanking.map((label, i) => {
          const model = labelToModel[label];
          return `${i + 1}. ${model?.modelName || label}`;
        }).join(', ')
      : 'Unable to parse';

    return `
      <tr>
        <td class="council-ranker">${r.modelName || 'Unknown'}</td>
        <td class="council-ranking-list">${parsedStr}</td>
      </tr>
    `;
  }).join('');

  // Build aggregate rankings
  const aggregateRows = (aggregateRankings || []).map((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    const avgRank = typeof r.avgRank === 'number' ? r.avgRank.toFixed(2) : 'N/A';
    return `
      <tr class="${i === 0 ? 'council-winner' : ''}">
        <td class="council-rank">${medal}</td>
        <td class="council-model-name">${r.modelName || 'Unknown'}</td>
        <td class="council-avg-rank">${avgRank}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="council-result">
      <div class="council-header">
        <span class="council-icon">🏛️</span>
        <span class="council-title">Council Results</span>
      </div>

      <div class="council-section">
        <div class="council-section-header">
          <span class="council-section-icon">📊</span>
          <span class="council-section-title">Peer Rankings</span>
        </div>
        <table class="council-rankings-table">
          <thead>
            <tr>
              <th>Ranker</th>
              <th>Their Ranking (Best → Worst)</th>
            </tr>
          </thead>
          <tbody>
            ${rankingsTableRows}
          </tbody>
        </table>
      </div>

      <div class="council-section">
        <div class="council-section-header">
          <span class="council-section-icon">🏆</span>
          <span class="council-section-title">Aggregate Scores</span>
        </div>
        <table class="council-aggregate-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Avg Score</th>
            </tr>
          </thead>
          <tbody>
            ${aggregateRows}
          </tbody>
        </table>
      </div>

      <div class="council-section council-synthesis-section">
        <div class="council-section-header">
          <span class="council-section-icon">📝</span>
          <span class="council-section-title">Chairman's Synthesis</span>
          <span class="council-chairman-name">(${synthesis?.modelName || 'Chairman'})</span>
        </div>
        <div class="council-synthesis-content">
          ${escapeHtml(synthesis?.content || 'No synthesis available')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render a loading state for council
 *
 * @param {string} stage - Current stage being processed
 * @returns {string} HTML string
 */
export function renderCouncilLoading(stage = 'rankings') {
  const stageText = stage === 'rankings'
    ? 'Collecting rankings from models...'
    : 'Chairman is synthesizing final answer...';

  return `
    <div class="council-result council-loading">
      <div class="council-header">
        <span class="council-icon">🏛️</span>
        <span class="council-title">Consulting Council</span>
      </div>
      <div class="council-loading-content">
        <div class="council-spinner"></div>
        <span class="council-loading-text">${stageText}</span>
      </div>
    </div>
  `;
}

/**
 * Render an error state for council
 *
 * @param {string} errorMessage - Error message to display
 * @returns {string} HTML string
 */
export function renderCouncilError(errorMessage) {
  return `
    <div class="council-result council-error">
      <div class="council-header">
        <span class="council-icon">🏛️</span>
        <span class="council-title">Council Error</span>
      </div>
      <div class="council-error-content">
        <span class="council-error-icon">⚠️</span>
        <span class="council-error-text">${escapeHtml(errorMessage)}</span>
      </div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
