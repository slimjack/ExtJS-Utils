///#source 1 1 /src/Lookup.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.Lookup', {
    statics: {
        fromArray: function(array, keySelector, valueSelector) {
            var lookup = new Ext.ux.util.Lookup();
            valueSelector = valueSelector || function(item) { return item; };
            Ext.Array.forEach(array, function(item) {
                lookup.add(keySelector(item), valueSelector(item));
            });
            return lookup;
        }
    },

    constructor: function(lookup) {
        var me = this;
        me.map = {};
        if (lookup) {
            lookup.each(function (value, key) {
                me.add(key, value);
            });
        }
    },

    add: function(key, value) {
        var me = this;
        if (!me.map[key]) {
            me.map[key] = [];
        }
        me.map[key].push(value);
    },

    remove: function(key, value) {
        var me = this;
        if (me.map[key]) {
            if (Ext.isArray(value)) {
                var predicate = value;
                value = Ext.Array.findBy(me.map[key], predicate);
            }
            Ext.Array.remove(me.map[key], value);
        }
    },

    contains: function (key, value) {
        var me = this;
        if (me.map[key]) {
            return Ext.Array.contains(me.map[key], value);
        }
        return false;
    },

    find: function (key, predicate) {
        var me = this;
        if (me.map[key]) {
            return Ext.Array.findBy(me.map[key], predicate);
        }
    },

    removeAll: function() {
        var me = this;
        me.map = {};
    },

    removeKey: function(key) {
        var me = this;
        if (me.map[key]) {
            delete me.map[key];
        }
    },

    get: function(key) {
        var me = this;
        return me.map[key];
    },

    clear: function() {
        var me = this;
        me.map = {};
    },

    clone: function() {
        var me = this;
        return new Ext.ux.util.Lookup(me);
    },

    each: function (fn, scope) {
        var me = this;
        var keepIterating;
        Ext.Object.each(me.map, function (key, group) {
            Ext.Array.each(group, function (value) {
                return keepIterating = fn.call(scope, value, key);
            });
            return keepIterating;
        });
    },

    eachForKey: function (key, fn, scope) {
        var me = this;
        if (me.map[key]) {
            Ext.Array.each(me.map[key], function (value) {
                return fn.call(scope, value);
            });
        }
    },

    eachKey: function (fn, scope) {
        var me = this;
        Ext.Object.each(me.map, function (key, group) {
            return fn.call(scope, key, group);
        });
    }
});
///#source 1 1 /src/DynamicComponentQuery.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.DynamicComponentQuery', {
    alternateClassName: 'DynamicComponentQuery',
    _defaultMethods: ['disable', 'enable', 'setReadOnly', 'setDisabled'],
    _defaultEvents: [],
    mixins: ['Ext.util.Observable'],
    constructor: function (config, query, excludeQuery) {
        var me = this;
        if (config instanceof Ext.Component) {
            config = {
                view: config,
                query: query,
                excludeQuery: excludeQuery
            };
        }
        Ext.apply(this, config);
        this.mixins.observable.constructor.call(this, config);
        if (!me.query) {
            Ext.Error.raise('"query" is not specified');
        }
        if (!me.view) {
            Ext.Error.raise('"view" is not specified');
        }
        if (!(me.view instanceof Ext.AbstractComponent)) {
            Ext.Error.raise('"view" is not an instance of Ext.AbstractComponent');
        }

        me._everyDelegates = [];
        me._everyRemovedDelegates = [];
        me._eventRelayers = {};
        me._events = Ext.Array.union(me._defaultEvents, Ext.Array.from(me.events));
        delete me.events;
        me.relayComponentsEvents();

        var methods = Ext.Array.union(me._defaultMethods, Ext.Array.from(me.methods));
        delete me.methods;
        me.createProxyMethods(methods);

        if (me.view instanceof Ext.container.Container) {
            me.view.on('add', me.onAddComponent, me);
            me.view.on('remove', me.onAddComponent, me);
        }
    },

    //region Public methods
    each: function (fn) {
        var me = this;
        Ext.Array.forEach(me.select(), fn);
    },

    contains: function(item) {
        var me = this;
        return Ext.Array.contains(me.select(), item);
    },

    isEmpty: function () {
        var me = this;
        return !(me.select().length);
    },

    invoke: function (method) {
        var me = this;
        var args = Array.prototype.slice.call(arguments, 1);
        var result = null;
        Ext.Array.each(me.select(), function (component) {
            result = component[method].apply(component, args);
        });
        return result;
    },

    every: function (delegate) {
        var me = this;
        Ext.Array.include(me._everyDelegates, delegate);
        me.each(delegate);
    },

    everyRemoved: function (delegate) {
        var me = this;
        Ext.Array.include(me._everyRemovedDelegates, delegate);
    },
    //endregion

    //region Private methods
    relayComponentsEvents: function () {
        var me = this;
        me.every(function (component) {
            me._eventRelayers[component.id] = me.relayEvents(component, me._events);
        });
        me.everyRemoved(function (component) {
            Ext.destroy(me._eventRelayers[component.id]);
            delete me._eventRelayers[component.id];
        });
    },

    createProxyMethods: function (methods) {
        var me = this;
        Ext.Array.forEach(methods, function (method) {
            if (!me[method]) {
                me[method] = Ext.bind(me.invoke, me, [method], 0);
            }
        });
    },

    select: function () {
        var me = this;
        if (!me._selectedComponents) {
            me._selectedComponents = me.view.query(me.query);
            if (me.excludeQuery) {
                me._selectedComponents = Ext.Array.difference(me._selectedComponents, me.view.query(me.excludeQuery));
            }
        }
        return me._selectedComponents;
    },

    onAddComponent: function () {
        var me = this;
        var oldComponents = me._selectedComponents;
        me._selectedComponents = null;
        var newComponents = me.select();
        var addedComponents = Ext.Array.difference(newComponents, oldComponents);
        if (addedComponents.length) {
            me.applyEvery(addedComponents);
            me.fireEvent('componentsadd', addedComponents);
        }
    },

    onRemoveComponent: function() {
        var me = this;
        var oldComponents = me._selectedComponents;
        me._selectedComponents = null;
        var newComponents = me.select();
        var removedComponents = Ext.Array.difference(oldComponents, newComponents);
        if (removedComponents.length) {
            me.applyEveryRemoved(removedComponents);
            me.fireEvent('componentsremove', removedComponents);
        }
    },

    applyEvery: function (components) {
        var me = this;
        Ext.Array.forEach(me._everyDelegates, function (delegate) {
            Ext.Array.forEach(components, delegate);
        });
    },

    applyEveryRemoved: function (components) {
        var me = this;
        Ext.Array.forEach(me._everyRemovedDelegates, function (delegate) {
            Ext.Array.forEach(components, delegate);
        });
    }
    //endregion
});

///#source 1 1 /src/DynamicViewController.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.DynamicViewController', {
    extend: 'Deft.mvc.ViewController',

    dynamicControl: {
        allFields: {
            selector: '[isFormField]:not([excludeForm])',
            excludeQuery: '[isFormField] [isFormField]'
        }
    },

    isReadOnly: false,
    dynamicLayoutContainerSelector: '',

    constructor: function () {
        var me = this;
        me.callParent(arguments);
        me.onBeforeInit();
    },

    init: function () {
        var me = this;
        var result = me.callParent();
        me.applyDynamicControl();
        if (Ext.isIE8) {
            me.getView().once('show', me.onAfterInit, me);
        } else {
            me.onAfterInit();
        }
        return result;
    },

    //region Protected
    onBeforeInit: Ext.emptyFn,
    onAfterInit: Ext.emptyFn,
    onBeforeApplyLayout: Ext.emptyFn,
    onAfterApplyLayout: function () {
        var me = this;
        me.updateViewState();
    },
    updateViewState: function () {
        var me = this;
        me.allFields.setReadOnly(me.isReadOnly);
    },
    
    finalizeEditing: function () {
        var me = this;
        me.getView().getEl().focus();
    },

    applyLayout: function (layout) {
        var me = this;
        if (layout) {
            var mainView = me.getView();
            var dynamicLayoutContainer = me.dynamicLayoutContainerSelector ? mainView.query(me.dynamicLayoutContainerSelector)[0] : mainView;
            me.onBeforeApplyLayout();
            dynamicLayoutContainer.removeAll();
            dynamicLayoutContainer.add(layout);
            dynamicLayoutContainer.doLayout();
            me.onAfterApplyLayout();
        }
    },

    setReadOnly: function (isReadOnly) {
        var me = this;
        if (me.isReadOnly !== isReadOnly) {
            me.isReadOnly = isReadOnly;
            me.updateViewState();
        }
    },
    //endregion

    //region Private
    applyDynamicControl: function () {
        var me = this;
        Ext.Object.each(me.dynamicControl, function (configName, config) {
            if (!me[configName]) {
                var events = null;
                var listeners = config.listeners;
                if (listeners) {
                    events = Ext.Object.getKeys(listeners);
                }
                me[configName] = new DynamicComponentQuery({
                    view: me.getView(),
                    query: config.selector || config.query,
                    excludeQuery: config.excludeQuery,
                    methods: config.methods,
                    events: events
                });
                if (listeners) {
                    listeners.scope = listeners.scope || me;
                    me[configName].on(listeners);
                }
            }
        });
    },
    //endregion

    statics: {
        initControlSection: function (data, cls, proto) {
            var control = {};
            if (proto.control) {
                var superControl = proto.control;
                delete proto.control;
                control = Ext.merge(control, superControl);
            }

            if (data.control) {
                var controlDefs = data.control;
                delete data.control;
                control = Ext.merge(control, controlDefs);
            }
            cls.control = proto.control = control;
        },

        initDynamicControlSection: function (data, cls, proto) {
            var dynamicControl = {};
            if (proto.dynamicControl) {
                var superDynamicControl = proto.dynamicControl;
                delete proto.dynamicControl;
                dynamicControl = Ext.merge(dynamicControl, superDynamicControl);
            }

            if (data.dynamicControl) {
                var dynamicControlDefs = data.dynamicControl;
                delete data.dynamicControl;
                dynamicControl = Ext.merge(dynamicControl, dynamicControlDefs);
            }
            cls.dynamicControl = proto.dynamicControl = dynamicControl;
        }
    }
},
function () {
    var Controller = this;

    Controller.onExtended(function (cls, data) {
        var proto = cls.prototype;

        Controller.initControlSection(data, cls, proto);
        Controller.initDynamicControlSection(data, cls, proto);
    });
});

///#source 1 1 /src/ExternalValidating.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.ExternalValidating', {
    alias: 'plugin.externalvalidating',
    extend: 'Ext.AbstractPlugin',

    init: function (formField) {
        var me = this;
        var externalErrors = {};
        var ignoreExternal = false;
        if (!formField.isFormField) {
            Ext.Error.raise('ExternalValidating plugin may be applied only to form fields');
        }
        Ext.override(formField, {
            getErrors: function() {
                var errors = this.callParent(arguments);
                if (!ignoreExternal) {
                    Ext.Object.each(externalErrors, function(sourceName, errorMessages) {
                        errors = errors.concat(errorMessages);
                    });
                }
                return errors;
            },

            getInternalErrors: function() {
                ignoreExternal = true;
                var result = this.getErrors();
                ignoreExternal = false;
                return result;
            },

            setExternalErrors: function (sourceName, errorMessages) {
                externalErrors[sourceName] = errorMessages || [];
                formField.validate();
            }
        });
    }
});
///#source 1 1 /src/GridStoreReconfiguring.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.GridStoreReconfiguring', {
    alias: 'plugin.gridstorereconfiguring',
    extend: 'Ext.AbstractPlugin',

    init: function (grid) {
        var me = this;
        if (!(grid instanceof Ext.grid.Panel)) {
            Ext.Error.raise('GridStoreReconfiguring plugin may be applied only to grid');
        }
        var bindableControls = new DynamicComponentQuery({
            view: grid,
            query: 'pagingtoolbar',//TODO: to be extended to select all bindable components (for now only pagintoolbars)
            methods: 'bindStore'
        });
        var currentStore = grid.store;
        bindableControls.bindStore(currentStore);
        bindableControls.on('componentsadd', function (addedComponents) {
            Ext.Array.each(addedComponents, function(component) {
                component.bindStore(currentStore);
            });
        });
        grid.on('reconfigure', function(sender, store, columns, oldStore) {
            if (store !== oldStore) {
                currentStore = store;
                bindableControls.bindStore(store);
            }
        });
    }
});
///#source 1 1 /src/ReadOnlyLatching.js
//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.plugin.ReadOnlyLatching', {
    alias: 'plugin.readonlylatching',
    extend: 'Ext.AbstractPlugin',

    init: function (formField) {
        var me = this;
        var readOnlyLatched = false;
        var originalReadOnlyState = false;
        if (!formField.isFormField) {
            Ext.Error.raise('ReadOnlyLatching plugin may be applied only to form fields');
        }
        Ext.override(formField, {
            setReadOnly: function (readOnly) {
                if (!readOnlyLatched) {
                    this.callParent(arguments);
                }
                originalReadOnlyState = readOnly;
            },

            latchReadOnly: function () {
                var temReadonly = originalReadOnlyState;
                formField.setReadOnly(true);
                readOnlyLatched = true;
                originalReadOnlyState = temReadonly;
            },

            unlatchReadOnly: function () {
                readOnlyLatched = false;
                formField.setReadOnly(originalReadOnlyState);
            }
        });
    }
});
