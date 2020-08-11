import * as fs from "fs";
import * as path from "path";
import { getDebugAdapterPort } from "../shared/utils/debug";
import { readDirAsync } from "../shared/utils/fs";

const launchConfigPath = ".vscode/launch.json";
const debuggerFolder = "src/debug";
const testFolder = "out/src/test";
const testProjectsFolder = "src/test/test_projects";

async function main() {
	const debugAdapters = (await readDirAsync(debuggerFolder))
		.filter((dirent) => dirent.isFile && dirent.name.endsWith("_entry.ts"));
	const launchConfig = {
		"version": "0.1.0",
		"configurations": [
			getExtensionConfig(),
			getGenerateLaunchConfigConfig(),
			...debugAdapters.map((dirent) => getDebugServerConfig(dirent.name, dirent.name)),
			getTestsConfig("multi_root", "projects.code-workspace"),
			getTestsConfig("dart_create_tests", "dart_create_tests.code-workspace"),
			getTestsConfig("flutter_create_tests", "flutter_create_tests.code-workspace"),
			getTestsConfig("multi_project_folder", ""),
			getTestsConfig("dart", "hello_world"),
			getTestsConfig("dart", "hello_world", true),
			getTestsConfig("dart_debug", "hello_world"),
			getTestsConfig("web_debug", "web"),
			getTestsConfig("flutter", "flutter_hello_world"),
			getTestsConfig("flutter_bazel", "bazel_workspace/flutter_hello_world_bazel"),
			getTestsConfig("flutter_snap", "empty"),
			getTestsConfig("flutter", "flutter_hello_world", true),
			getTestsConfig("flutter_debug", "flutter_hello_world"),
			getTestsConfig("flutter_debug", "flutter_hello_world", false, true),
			getTestsConfig("flutter_test_debug", "flutter_hello_world"),
			getTestsConfig("flutter_repository", "${env:FLUTTER_ROOT}"),
			getTestsConfig("not_activated/dart_create", "empty"),
			getTestsConfig("not_activated/flutter_create", "empty"),
		],
		"compounds": [
			{
				"name": "Extension + Debug Adapter Servers",
				"configurations": [
					"Extension",
					...debugAdapters.map((dirent) => getDebugServerConfigName(dirent.name))
				]
			},
			{
				"name": "Debug Adapter Servers",
				"configurations": debugAdapters.map((dirent) => getDebugServerConfigName(dirent.name)),
			},
		],
	}

	const header = '// This file was generated by src/tool/generate_launch_configs.ts!';
	const configJson = JSON.stringify(launchConfig, undefined, "\t");
	fs.writeFileSync(launchConfigPath, `${header}\n${configJson}\n`);
}

const template = {
	"request": "launch",
	"outFiles": [
		"${workspaceFolder}/out/**/*.js"
	],
	"smartStep": true,
	"skipFiles": [
		"<node_internals>/**",
		"**/app/out/vs/**"
	]
};

function getConfigName(input: string) {
	input = input.replace("_debug_entry.ts", "");
	return input.split("_").map(titleCase).join(" ");
}

function getDebugServerConfigName(input: string) {
	return `${getConfigName(input)} Debug Server`;
}

function titleCase(input: string) {
	return `${input[0].toUpperCase()}${input.slice(1)}`;
}

function getExtensionConfig() {
	return Object.assign({
		"name": "Extension",
		"type": "extensionHost",
		"runtimeExecutable": "${execPath}",
		"args": [
			"--extensionDevelopmentPath=${workspaceFolder}"
		],
		"env": {
			"DART_CODE_USE_DEBUG_SERVERS": "true",
		},
		"preLaunchTask": "npm: watch",
	}, template);
}

function getGenerateLaunchConfigConfig() {
	return Object.assign({
		"name": "Generate launch.json",
		"type": "node",
		"cwd": "${workspaceFolder}",
		"program": "${workspaceFolder}/src/tool/generate_launch_configs.ts",
		"preLaunchTask": "npm: watch-tests",
	}, template);
}

function getDebugServerConfig(filename: string, source: string) {
	const port = getDebugAdapterPort(path.basename(source).split(".")[0]);
	return Object.assign({
		"name": getDebugServerConfigName(filename),
		"type": "node",
		"cwd": "${workspaceFolder}",
		"program": `\${workspaceFolder}/${debuggerFolder}/${source}`,
		"args": [
			`--server=${port}`
		],
		"preLaunchTask": "npm: watch",
	}, template);
}

function getTestsConfig(testPath: string, project: string, lsp = false, chrome = false) {
	let name = getConfigName(testPath);
	if (lsp)
		name = `${name} LSP`;
	if (chrome)
		name = `${name} Chrome`;
	return Object.assign({
		"name": `Launch Tests (${name})`,
		"type": "extensionHost",
		"runtimeExecutable": "${execPath}",
		"args": [
			project.startsWith("${env:") ? project : `\${workspaceFolder}/${testProjectsFolder}/${project}`,
			"--extensionDevelopmentPath=${workspaceFolder}",
			`--extensionTestsPath=\${workspaceFolder}/${testFolder}/${testPath}`,
			"--user-data-dir=${workspaceFolder}/.dart_code_test_data_dir"
		],
		"env": {
			"DART_CODE_IS_TEST_RUN": "true",
			"DART_CODE_FORCE_LSP": lsp ? "true" : undefined,
			"FLUTTER_TEST_DEVICE_ID": chrome ? "chrome" : undefined,
		},
		"preLaunchTask": "npm: watch-tests",
	}, template);
}

// tslint:disable-next-line: no-floating-promises
main();