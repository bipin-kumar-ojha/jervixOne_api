import assert from "node:assert/strict";
import test from "node:test";
import { validationResult } from "express-validator";

process.env.NODE_ENV ||= "test";
process.env.PORT ||= "0";
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/jervix_test";
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.JWT_EXPIRES_IN ||= "15m";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
process.env.JWT_REFRESH_EXPIRES_IN ||= "7d";
process.env.CLOUDINARY_CLOUD_NAME ||= "test-cloud";
process.env.CLOUDINARY_API_KEY ||= "test-key";
process.env.CLOUDINARY_API_SECRET ||= "test-secret";

const runValidation = async (validators, { body = {}, params = {} } = {}) => {
	const req = { body, params };
	await Promise.all(validators.map((validator) => validator.run(req)));
	return validationResult(req).array();
};

const validProjectPayload = {
	projectName: "Website Redesign",
	startDate: "2026-06-01",
	deliveryDate: "2026-07-01",
	description: "Refresh the marketing website.",
	budget: 50000,
	techStacks: ["React", "Node"],
};

test("create project API validation accepts numeric budget and supported currency", async () => {
	const { createProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(createProjectValidators, {
		body: {
			...validProjectPayload,
			currency: "USD",
		},
	});

	assert.deepEqual(errors, []);
});

test("create project API validation accepts planning status", async () => {
	const { createProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(createProjectValidators, {
		body: {
			...validProjectPayload,
			status: "planning",
		},
	});

	assert.deepEqual(errors, []);
});

test("create project API validation defaults currency when omitted", async () => {
	const { createProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(createProjectValidators, {
		body: validProjectPayload,
	});

	assert.deepEqual(errors, []);
});

test("create project API validation rejects negative budgets and unsupported currencies", async () => {
	const { createProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(createProjectValidators, {
		body: {
			...validProjectPayload,
			budget: -1,
			currency: "EUR",
		},
	});
	const errorPaths = errors.map((error) => error.path).sort();

	assert.deepEqual(errorPaths, ["budget", "currency"]);
});

test("create project API validation rejects budget values with embedded currency symbols", async () => {
	const { createProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(createProjectValidators, {
		body: {
			...validProjectPayload,
			budget: "$50000",
		},
	});

	assert.deepEqual(errors.map((error) => error.path), ["budget"]);
});

test("update project API validation allows changing currency", async () => {
	const { updateProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(updateProjectValidators, {
		params: { id: "507f1f77bcf86cd799439011" },
		body: { currency: "USD" },
	});

	assert.deepEqual(errors, []);
});

test("update project API validation rejects invalid budget and currency", async () => {
	const { updateProjectValidators } = await import("../src/routes/project.routes.js");

	const errors = await runValidation(updateProjectValidators, {
		params: { id: "507f1f77bcf86cd799439011" },
		body: { budget: "50000", currency: "GBP" },
	});
	const errorPaths = errors.map((error) => error.path).sort();

	assert.deepEqual(errorPaths, ["budget", "currency"]);
});

test("project responses include budget and currency with INR as the default", async () => {
	const { default: Project } = await import("../src/models/project.model.js");

	const project = new Project(validProjectPayload);
	const response = project.toJSON();

	assert.equal(response.budget, 50000);
	assert.equal(response.currency, "INR");
});

test("project list/detail serialization returns stored currency", async () => {
	const { default: Project } = await import("../src/models/project.model.js");

	const project = new Project({
		...validProjectPayload,
		currency: "USD",
	});
	const response = project.toJSON();

	assert.equal(response.budget, 50000);
	assert.equal(response.currency, "USD");
});
