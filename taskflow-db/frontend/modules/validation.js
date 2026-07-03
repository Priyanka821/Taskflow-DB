// modules/validation.js
// Pure functions for validating task input. Kept separate from
// rendering/events so the rules can be unit-tested in isolation.
//
// Uses the shared window.TaskFlow namespace instead of ES module
// import/export — see the note at the top of modules/storage.js for why.

window.TaskFlow = window.TaskFlow || {};

(function () {
  const MAX_TASK_LENGTH = 120;

  /**
   * Validate a raw task input string.
   * @param {string} value
   * @returns {{ valid: boolean, message: string, value: string }}
   */
  function validateTaskInput(value) {
    const trimmed = (value || '').trim();

    if (trimmed.length === 0) {
      return { valid: false, message: 'Task can\u2019t be empty.', value: trimmed };
    }

    if (trimmed.length > MAX_TASK_LENGTH) {
      return {
        valid: false,
        message: `Keep it under ${MAX_TASK_LENGTH} characters (currently ${trimmed.length}).`,
        value: trimmed,
      };
    }

    return { valid: true, message: '', value: trimmed };
  }

  /**
   * Escape HTML special characters to prevent XSS when injecting
   * user-provided text via innerHTML.
   * @param {string} str
   * @returns {string}
   */
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (tag) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[tag]));
  }

  window.TaskFlow.validation = { MAX_TASK_LENGTH, validateTaskInput, escapeHTML };
})();