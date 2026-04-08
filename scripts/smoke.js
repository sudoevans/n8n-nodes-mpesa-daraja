const fs = require('fs');
const path = require('path');
const assert = require('assert');

function load(modulePath) {
	return require(path.join(__dirname, '..', modulePath));
}

function main() {
	const mpesaNodePath = path.join(__dirname, '..', 'dist', 'nodes', 'Mpesa', 'Mpesa.node.js');
	const mpesaTriggerPath = path.join(__dirname, '..', 'dist', 'nodes', 'MpesaTrigger', 'MpesaTrigger.node.js');
	const credentialPath = path.join(__dirname, '..', 'dist', 'credentials', 'MpesaApi.credentials.js');

	assert.ok(fs.existsSync(mpesaNodePath), 'Missing built Mpesa node');
	assert.ok(fs.existsSync(mpesaTriggerPath), 'Missing built Mpesa trigger node');
	assert.ok(fs.existsSync(credentialPath), 'Missing built Mpesa credential');

	const { Mpesa } = load('dist/nodes/Mpesa/Mpesa.node.js');
	const { MpesaTrigger } = load('dist/nodes/MpesaTrigger/MpesaTrigger.node.js');
	const { MpesaApi } = load('dist/credentials/MpesaApi.credentials.js');

	const credential = new MpesaApi();
	assert.strictEqual(credential.icon, 'file:../nodes/Mpesa/mpesa.svg');

	const credentialPropertyNames = credential.properties.map((property) => property.name);
	for (const propertyName of ['consumerKey', 'consumerSecret', 'passkey', 'securityCredential']) {
		assert.ok(credentialPropertyNames.includes(propertyName), `Missing credential property: ${propertyName}`);
	}

	const mpesa = new Mpesa();
	assert.strictEqual(
		mpesa.description.subtitle,
		'={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		'Unexpected Mpesa subtitle format',
	);

	const resourceProperty = mpesa.description.properties.find((property) => property.name === 'resource');
	assert.ok(resourceProperty, 'Missing resource property');
	assert.deepStrictEqual(
		resourceProperty.options.map((option) => option.name),
		['Account', 'B2B', 'B2C', 'C2B', 'Identity', 'Pull API', 'STK Push'],
		'Resource options are not alphabetically sorted',
	);

	const trigger = new MpesaTrigger();
	assert.ok(trigger.webhookMethods?.default?.checkExists, 'Missing trigger checkExists stub');
	assert.ok(trigger.webhookMethods?.default?.create, 'Missing trigger create stub');
	assert.ok(trigger.webhookMethods?.default?.delete, 'Missing trigger delete stub');

	console.log('Smoke checks passed.');
}

main();
