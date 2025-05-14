// Finds which element is below the pointer for drop
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  
  function setupColumn(col) {
    const blank = col.querySelector('.blank-line');
  
    // Clear placeholder on focus
    blank.addEventListener('focus', () => {
      if (blank.textContent.trim() === '+ Add new…') {
        blank.textContent = '';
      }
    });
    blank.addEventListener('input', () => {
      if (blank.textContent.trim() === '+ Add new…') {
        blank.textContent = '';
      }
    });
    // Restore placeholder on blur if left empty
    blank.addEventListener('blur', () => {
      if (!blank.textContent.trim()) blank.textContent = '+ Add new…';
    });
  
    // Enter key creates a new card *without* spawning extra blanks
    blank.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = blank.textContent.trim();
        if (!text) return;
        // Create card
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.draggable = true;
        card.textContent = text;
        setupCard(card);
        col.insertBefore(card, blank);
        // Reset blank
        blank.textContent = '+ Add new…';
        blank.blur();
      }
    });
  
    // Allow dropping cards
    col.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      const after = getDragAfterElement(col, e.clientY);
      if (after) col.insertBefore(dragging, after);
      else col.insertBefore(dragging, blank);
    });
  }
  
  function setupCard(card) {
    // Drag handlers
    card.addEventListener('dragstart', () => card.classList.add('dragging'));
    card.addEventListener('dragend',   () => card.classList.remove('dragging'));
    // Right-click to delete
    card.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (confirm('Supprimer cette tâche ?')) card.remove();
    });
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.kanban-column').forEach(setupColumn);
  });
