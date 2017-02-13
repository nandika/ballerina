/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Module to provide items(tool groups, tools) for a given tool palette.
 */
define(['log', 'lodash', './../env/package', './../tool-palette/tool-palette', './../tool-palette/tool-group',
        './../env/environment', './initial-definitions', 'event_channel', './../ast/ballerina-ast-factory'],
    function (log, _, Package, ToolPalette, ToolGroup, Environment, InitialTools, EventChannel, BallerinaASTFactory) {

        /**
         * constructs ToolPaletteItemProvider
         * @param {Object} args - data to create ToolPaletteItemProvider
         * @constructor
         */
        var ToolPaletteItemProvider = function (args) {
            // array which contains initial tool groups
            this._initialToolGroups = _.get(args, 'initialToolGroups', []);
            // array which contains all the tool groups for a particular tool palette item provider
            this._toolGroups = _.get(args, 'toolGroups', []);
            // array which contains tool groups that are added on the fly
            this._dynamicToolGroups = _.get(args, 'dynamicToolGroups', []);

            var self = this;
            // Packages to be added to the tool palette by default in order.
            this._defaultImportedPackages = [];
            _.forEach(["ballerina.net.http", "ballerina.lang.*"],
                function (defaultPackageString) {
                    var packagesToImport = Environment.searchPackage(defaultPackageString);
                    _.forEach(packagesToImport, function (packageToImport) {
                        self._defaultImportedPackages.push(packageToImport);
                    });
                });

            // views added to tool palette for each imported package keyed by package name
            this._importedPackagesViews = {};

            this.init();
        };

        ToolPaletteItemProvider.prototype = Object.create(EventChannel.prototype);
        ToolPaletteItemProvider.prototype.constructor = ToolPaletteItemProvider;

        /**
         * init function
         */
        ToolPaletteItemProvider.prototype.init = function () {
            var self = this;

            this._initialToolGroups = _.slice(InitialTools);
            this._toolGroups = _.merge(this._initialToolGroups, this._dynamicToolGroups);

            // Adding default packages
            _.forEach(self._defaultImportedPackages, function (packageToImport) {
                self.addImport(packageToImport);
            });
        };

        /**
         * returns initial tool groups
         * @returns {Object[]}
         */
        ToolPaletteItemProvider.prototype.getInitialToolGroups = function () {
            return this._initialToolGroups;
        };

        /**
         * returns all the tool groups
         * @returns {Object[]}
         */
        ToolPaletteItemProvider.prototype.getToolGroups = function () {
            return this._toolGroups;
        };

        /**
         * sets tool palette
         * @param toolPalette - tool palette
         */
        ToolPaletteItemProvider.prototype.setToolPalette = function (toolPalette) {
            this._toolPalette = toolPalette;
        };

        /**
         * function to add imports. Packages will be converted to a ToolGroup and added to relevant arrays
         * @param package - package to be imported
         */
        ToolPaletteItemProvider.prototype.addImport = function (package, index) {
            if (package instanceof Package) {
                var group = this.getToolGroup(package);
                if (_.isNil(index)) {
                    this._dynamicToolGroups.push(group);
                    this._toolGroups.push(group);
                } else {
                    this._dynamicToolGroups.splice(index, 0, group);
                    this._toolGroups.splice(index, 0, group);
                }
            }
        };

        /**
         * Adds a tool group view to the tool palette for a given package
         * @param package - package to be added
         */
        ToolPaletteItemProvider.prototype.addImportToolGroup = function (package) {
            if (package instanceof Package) {
                var isADefaultPackage = _.includes(this._defaultImportedPackages, package);
                if (!isADefaultPackage) { // Removing existing package
                    // Re-adding the package
                    var group = this.getToolGroup(package);
                    var groupView = this._toolPalette.addVerticallyFormattedToolGroup({group: group});
                    this._importedPackagesViews[package.getName()] = groupView;
                }
            }
        };

        /**
         * Removes a tool group view from the tool palette for a given package name
         * @param packageName - name of the package to be removed
         */
        ToolPaletteItemProvider.prototype.removeImportToolGroup = function (packageName) {
            var removingView = this._importedPackagesViews[packageName];
            if(!_.isNil(removingView)){
                removingView.remove();
            }
        };

        /**
         * returns the array of dynamicToolGroups
         * @returns {Object[]}
         */
        ToolPaletteItemProvider.prototype.getDynamicToolGroups = function () {
            return this._dynamicToolGroups;
        };

        /**
         * Create and return a ToolGroup object for a given package
         * @param package {Package} Package Object.
         */
        ToolPaletteItemProvider.prototype.getToolGroup = function (package) {
            var definitions = [];
            var self = this;
            _.each(package.getConnectors(), function (connector) {
                var packageName = _.last(_.split(package.getName(), '.'));
                connector.nodeFactoryMethod = BallerinaASTFactory.createConnectorDeclaration;
                connector.meta = {
                    connectorName: connector.getName(),
                    connectorPackageName: packageName
                };
                //TODO : use a generic icon
                connector.icon = "images/tool-icons/connector.svg";
                connector.title = connector.getName();
                connector.id = connector.getName();
                definitions.push(connector);

                var toolGroupID = package.getName() + "-tool-group";
                // registering connector name-modified event
                connector.on('name-modified', function(newName, oldName){
                    self.updateToolItem(toolGroupID, connector, newName);
                });

                _.each(connector.getActions(), function (action, index, collection) {
                    /* We need to add a special class to actions to indent them in tool palette. */
                    action.classNames = "tool-connector-action";
                    if ((index + 1 ) == collection.length) {
                        action.classNames = "tool-connector-action tool-connector-last-action";
                    }
                    action.meta = {
                        action: action.getName(),
                        actionConnectorName: connector.getName(),
                        actionPackageName: packageName
                    };
                    action.icon = "images/tool-icons/action.svg";
                    action.title = action.getName();
                    action.nodeFactoryMethod = BallerinaASTFactory.createActionInvocationExpression;
                    action.id = connector.getName() + '-' + action.getAction();
                    definitions.push(action);

                    var toolGroupID = package.getName() + "-tool-group";
                    // registering connector action name-modified event
                    action.on('name-modified', function(newName, oldName){
                        self.updateToolItem(toolGroupID, action, newName);
                    });
                });
                connector.on('connector-action-added', function (action) {
                    var actionIcon = "images/tool-icons/action.svg";
                    var toolGroupID = package.getName() + "-tool-group";
                    action.classNames = "tool-connector-action";
                    var actionNodeFactoryMethod = BallerinaASTFactory.createActionInvocationExpression;
                    self.addToToolGroup(toolGroupID, action, actionNodeFactoryMethod, actionIcon);
                });

                connector.on('connector-action-removed', function (action) {
                    var toolGroupID = package.getName() + "-tool-group";
                    var toolId = action.getActionName();
                    self._toolPalette.removeToolFromGroup(toolGroupID, toolId);
                });
            });

            _.each(package.getFunctionDefinitions(), function (functionDef) {
                var packageName = _.last(_.split(package.getName(), '.'));
                if (functionDef.getReturnParams().length > 0){
                    functionDef.nodeFactoryMethod = BallerinaASTFactory.createAggregatedFunctionInvocationExpression;
                } else {
                    functionDef.nodeFactoryMethod = BallerinaASTFactory.createAggregatedFunctionInvocationStatement;
                }
                functionDef.meta = {
                    functionName: functionDef.getName(),
                    packageName: packageName
                };
                functionDef.icon = "images/tool-icons/function.svg";
                functionDef.title = functionDef.getName();
                functionDef.id = functionDef.getName();
                definitions.push(functionDef);

                var toolGroupID = package.getName() + "-tool-group";
                // registering function name-modified event
                functionDef.on('name-modified', function(newName, oldName){
                    self.updateToolItem(toolGroupID, functionDef, newName);
                });
            });

            var group = new ToolGroup({
                toolGroupName: package.getName(),
                toolGroupID: package.getName() + "-tool-group",
                toolOrder: "vertical",
                toolDefinitions: definitions
            });

            package.on('connector-defs-added', function (connector) {
                var nodeFactoryMethod = BallerinaASTFactory.createConnectorDeclaration;
                var toolGroupID = package.getName() + "-tool-group";
                var icon = "images/tool-icons/connector.svg";
                this.addToToolGroup(toolGroupID, connector, nodeFactoryMethod, icon);

                connector.on('name-modified', function (newName, oldName) {
                    self.updateToolItem(toolGroupID, connector, newName);
                });

                connector.on('connector-action-added', function (action) {
                    var actionIcon = "images/tool-icons/action.svg";
                    action.classNames = "tool-connector-action";
                    action.setId(action.getId());
                    var actionNodeFactoryMethod = BallerinaASTFactory.createActionInvocationExpression;
                    self.addToToolGroup(toolGroupID, action, actionNodeFactoryMethod, actionIcon);

                    action.on('name-modified', function (newName, oldName) {
                        self.updateToolItem(toolGroupID, action, newName);
                    });

                });

                connector.on('connector-action-removed', function (action) {
                    var toolGroupID = package.getName() + "-tool-group";
                    var toolId = action.getActionName();
                    self._toolPalette.removeToolFromGroup(toolGroupID, toolId);
                });

            }, this);

            package.on('function-defs-added', function (functionDef) {
                var nodeFactoryMethod = BallerinaASTFactory.createAggregatedFunctionInvocationStatement;
                if (functionDef.getReturnParams().length > 0){
                    nodeFactoryMethod = BallerinaASTFactory.createAggregatedFunctionInvocationExpression;
                }
                // since functions are added to the current package, function name does not need
                // packageName:functionName format
                functionDef.meta = {
                    functionName: functionDef.getName()
                };
                var toolGroupID = package.getName() + "-tool-group";
                var icon = "images/tool-icons/function.svg";
                this.addToToolGroup(toolGroupID, functionDef, nodeFactoryMethod, icon);

                functionDef.on('name-modified', function(newName, oldName){
                    self.updateToolItem(toolGroupID, functionDef, newName);
                });
            }, this);

            var self = this;
            package.on('function-def-removed', function (functionDef) {
                var toolGroupID = package.getName() + "-tool-group";
                var toolId = functionDef.getFunctionName();
                self._toolPalette.removeToolFromGroup(toolGroupID, toolId);
            });

            // registering event handler for 'connector-def-removed' event
            package.on('connector-def-removed', function (connectorDef) {
                var toolGroupID = package.getName() + "-tool-group";
                var toolId = connectorDef.getConnectorName();
                self._toolPalette.removeToolFromGroup(toolGroupID, toolId);
            });

            return group;
        };

        /**
         * Adds the tool view to the given tool group
         * @param toolGroupID - tool group id
         * @param toolItem - tool item to be added
         * @param nodeFactoryMethod - factory method to create instance when the tool being dragged and dropped
         */
        ToolPaletteItemProvider.prototype.addToToolGroup = function (toolGroupID, toolItem, nodeFactoryMethod, icon) {
            var tool = {};
            tool.nodeFactoryMethod = nodeFactoryMethod;
            tool.icon = icon;
            tool.title = toolItem.getName();
            tool.id = toolItem.getName();
            tool.classNames = toolItem.classNames;
            tool.meta = toolItem.meta;
            this._toolPalette.addNewToolToGroup(toolGroupID, tool);
        };

        /**
         * updates tool item with given new values
         * @param {string} toolGroupID - Id of the tool group
         * @param {Object} toolItem - tool object
         * @param {Object} newValue - new value for the tool
         */
        ToolPaletteItemProvider.prototype.updateToolItem = function (toolGroupID, toolItem, newValue) {
            this._toolPalette.updateToolPaletteItem(toolGroupID, toolItem, newValue);
        };

        return ToolPaletteItemProvider;
    });
