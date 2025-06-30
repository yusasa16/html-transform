import type { Transform } from "../../src/types";

export default {
	name: "update-header",
	description: "Update header content while preserving ID",
	transform: ({ document }) => {
		const header = document.querySelector("header");
		if (header) {
			const h1 = header.querySelector("h1");
			if (h1) {
				h1.textContent = "New Transformed Header";
			}

			const nav = header.querySelector("nav ul");
			if (nav) {
				nav.innerHTML = `
					<li><a href="#home">Home</a></li>
					<li><a href="#about">About</a></li>
					<li><a href="#services">Services</a></li>
					<li><a href="#contact">Contact</a></li>
				`;
			}
		}
	},
} as Transform;
