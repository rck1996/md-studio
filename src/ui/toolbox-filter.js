const normalizeSearchValue = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const bindToolboxFilter = ({ input, groups, emptyState }) => {
  const filterTools = () => {
    const query = normalizeSearchValue(input.value);
    let visibleCount = 0;

    groups.forEach((group) => {
      const buttons = [...group.querySelectorAll("[data-format]")];
      buttons.forEach((button) => {
        const isVisible = !query || normalizeSearchValue(button.textContent).includes(query);
        button.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });
      group.hidden = buttons.every((button) => button.hidden);
    });

    emptyState.hidden = visibleCount > 0;
  };

  input.addEventListener("input", filterTools);
  filterTools();

  return {
    reset: () => {
      input.value = "";
      filterTools();
    },
  };
};
