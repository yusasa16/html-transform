import type { Transform } from "../../src/types";

export default {
	name: "add-class",
	description: "Add new CSS classes to elements",
	transform: ({ document }) => {
		const oldClassDiv = document.querySelector(".old-class");
		if (oldClassDiv) {
			oldClassDiv.classList.add("new-class", "transformed");
			oldClassDiv.textContent = "Updated content with new classes";
		}

		const contentSection = document.querySelector(".content");
		if (contentSection) {
			contentSection.classList.add("enhanced-content");
		}
	},
} as Transform;
