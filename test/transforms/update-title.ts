import type { Transform } from "../../src/types";

export default {
	name: "update-title",
	description: "Update page title to a new value",
	transform: ({ document }) => {
		const titleElement = document.querySelector("title");
		if (titleElement) {
			titleElement.textContent = "Transformed Title";
		}
	},
} as Transform;
