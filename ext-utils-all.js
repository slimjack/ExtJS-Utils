//https://github.com/slimjack/ExtJs-Utils

Ext.abstractFn = function (msgTpl) {
    var fn = function () {
        var thisMethodName = fn.$name;
        var callerMethodName = fn.caller.$name;
        if ((thisMethodName !== callerMethodName) && (callerMethodName !== 'callParent')) {
            var className = fn.caller.$owner.$className;
            var fullMethodName = className ? className + '.' + thisMethodName : thisMethodName;
            var message = Ext.String.format(msgTpl || "Method '{0}' is abstract and can't be called.", fullMethodName);
            Ext.Error.raise(message);
        }
    };
    return fn;
};

Ext.createIdleThrottled = function (fn, scope) {
    var _isIdleThrottledCallScheduled = false;
    var fnWrapper = function fnWrapper() {
        _isIdleThrottledCallScheduled = false;
        scope = scope || this;
        if (!scope.isDestroyed) {
            fn.apply(scope, arguments);
        }
    };
    return function () {
        if (!_isIdleThrottledCallScheduled) {
            _isIdleThrottledCallScheduled = true;
            fnWrapper.apply(this, arguments);
            // TODO temporary solution, remove line above and uncomment below after fixing updating _selectedComponents field
            //Ext.defer(fnWrapper, 1, this, arguments);
        }
    };
};

//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.Lookup', {
    statics: {
        fromArray: function (array, keySelector, valueSelector) {
            var lookup = new Ext.ux.util.Lookup();
            valueSelector = valueSelector || function (item) { return item; };
            Ext.Array.forEach(array, function (item) {
                lookup.add(keySelector(item), valueSelector(item));
            });
            return lookup;
        }
    },

    constructor: function (lookup) {
        var me = this;
        me.map = {};
        if (lookup) {
            lookup.each(function (value, key) {
                me.add(key, value);
            });
        }
    },

    add: function (key, value) {
        var me = this;
        if (!me.map[key]) {
            me.map[key] = [];
        }
        me.map[key].push(value);
    },

    remove: function (key, value) {
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

    removeAll: function () {
        var me = this;
        me.map = {};
    },

    removeKey: function (key) {
        var me = this;
        if (me.map[key]) {
            delete me.map[key];
        }
    },

    get: function (key) {
        var me = this;
        return me.map[key];
    },

    clear: function () {
        var me = this;
        me.map = {};
    },

    clone: function () {
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
        me.view.on('destroy', me.onViewDestroyed, me);
        me.subscribeOnLayoutChange();
    },

    onViewDestroyed: function () {
        var me = this;
        me.destroy();
    },

    destroy: function () {
        var me = this;
        me._isDestroyed = true;
        me._everyDelegates = [];
        me._everyRemovedDelegates = [];
        Ext.Object.eachValue(me._eventRelayers, function (relayer) {
            Ext.destroy(relayer);
        });
        me._eventRelayers = {};
        me.clearListeners();
        me.callParent(arguments);
    },

    //region Public methods
    each: function (fn) {
        var me = this;
        Ext.Array.forEach(me.select(), fn);
    },

    contains: function (item) {
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

    subscribeOnLayoutChange: function () {
        var me = this;
        if (!me.onAddComponentIdleThrottled) {
            me.onAddComponentIdleThrottled = Ext.createIdleThrottled(me.onAddComponent);
        }
        if (!me.onRemoveComponentIdleThrottled) {
            me.onRemoveComponentIdleThrottled = Ext.createIdleThrottled(me.onRemoveComponent);
        }
        if (me.view.isContainer) {
            var containers = me.view.query('[isContainer]');
            containers.push(me.view);
            Ext.Array.forEach(containers, function (container) {
                container.on('add', me.onAddComponentIdleThrottled, me);
                container.on('remove', me.onRemoveComponentIdleThrottled, me);
            });
        }
    },

    onAddComponent: function () {
        var me = this;
        me.subscribeOnLayoutChange();
        var oldComponents = me._selectedComponents;
        me._selectedComponents = null;
        var newComponents = me.select();
        var addedComponents = Ext.Array.difference(newComponents, oldComponents);
        if (addedComponents.length) {
            me.applyEvery(addedComponents);
            me.fireEvent('componentsadd', addedComponents);
        }
    },

    onRemoveComponent: function () {
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

//https://github.com/slimjack/ExtJs-Utils

Ext.define('Ext.ux.util.DynamicViewController', {
    extend: 'Deft.mvc.ViewController',

    dynamicControl: {
        allFields: {
            selector: '[isFormField]:not([excludeForm])',
            excludeQuery: '[isFormField] [isFormField], [controller] [isFormField]',
            methods: ['validate']
        }
    },

    control: {
        '#': {
            boxready: 'onViewBoxReady'
        }
    },

    dynamicLayoutContainerSelector: '',

    config: {
        readOnly: false
    },

    constructor: function () {
        var me = this;
        me.callParent(arguments);
    },

    init: function () {
        var me = this;
        var result = me.callParent();
        me.onInit();
        me.onInitAsync(function () {
            me.onAfterInitAsync();
        });
        me.applyDynamicControl();
        return result;
    },

    //region Protected
    onViewBoxReady: function () {
        var me = this;
        me.isViewReady = true;
        me.onViewReady();
        me.onViewReadyAsync(function () {
            me.onAfterViewReadyAsync();
        });
    },

    onViewReady: Ext.emptyFn,
    onAfterViewReadyAsync: Ext.emptyFn,

    onViewReadyAsync: function (callback) {
        var me = this;
        callback();
    },

    onInit: function () {
        var me = this;
        me.onAfterInit();
    },

    afterRender: function () {
        var me = this;
        me.rendered = true;
        me.onUpdateViewState();
    },

    onAfterInit: Ext.emptyFn,

    onInitAsync: function (callback) {
        var me = this;
        callback();
    },

    onAfterInitAsync: Ext.emptyFn,

    applyLayout: function (layout) {
        var me = this;
        if (layout) {
            var mainView = me.getView();
            var dynamicLayoutContainer = me.dynamicLayoutContainerSelector ? mainView.query(me.dynamicLayoutContainerSelector)[0] : mainView;
            Ext.suspendLayouts();
            me.onBeforeApplyLayout();
            dynamicLayoutContainer.removeAll();
            dynamicLayoutContainer.add(layout);
            me.onAfterApplyLayout();
            Ext.resumeLayouts(true);
        }
    },

    onBeforeApplyLayout: Ext.emptyFn,

    onAfterApplyLayout: function () {
        var me = this;
        me.onUpdateViewState();
    },

    onUpdateViewState: function () {
        var me = this;
        me.allFields.setReadOnly(me.getReadOnly());
    },

    finalizeEditing: function () {
        var me = this;
        if (me.getView().isVisible()) {
            me.getView().getEl().focus();
        }
    },

    updateReadOnly: function (isReadOnly) {
        var me = this;
        if (me.isViewReady) {
            me.onUpdateViewState();
        }
    },
    //endregion

    //region Private

    applyDynamicControl: function () {
        var me = this;
        Ext.Object.each(me.dynamicControl, function (configName, config) {
            if (!me[configName]) {
                var events = null;
                var listeners = Ext.clone(config.listeners);
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

            Controller.initDynamicControlSection(data, cls, proto);
        });
    });

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

        if (Ext.isString(formField.valuePublishEvent)) {
            formField.un(formField.valuePublishEvent, formField.publishValue, formField);
        } else {
            for (var i = 0, len = formField.valuePublishEvent.length; i < len; ++i) {
                formField.un(formField.valuePublishEvent[i], formField.publishValue, formField);
            }
        }

        Ext.override(formField, {
            publishValue: function () {
                var me = this;

                if (me.rendered && !me.getInternalErrors().length) {
                    me.publishState('value', me.getValue());
                }
            },

            getErrors: function () {
                var errors = this.callParent(arguments);
                if (!ignoreExternal) {
                    Ext.Object.each(externalErrors, function (sourceName, errorMessages) {
                        errors = errors.concat(errorMessages);
                    });
                }
                return errors;
            },

            getInternalErrors: function () {
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

        if (Ext.isString(formField.valuePublishEvent)) {
            formField.on(formField.valuePublishEvent, formField.publishValue, formField);
        } else {
            for (i = 0, len = formField.valuePublishEvent.length; i < len; ++i) {
                formField.on(formField.valuePublishEvent[i], formField.publishValue, formField);
            }
        }
    }
});
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
            Ext.Array.each(addedComponents, function (component) {
                component.bindStore(currentStore);
            });
        });
        grid.on('reconfigure', function (sender, store, columns, oldStore) {
            if (store !== oldStore) {
                currentStore = store;
                bindableControls.bindStore(store);
            }
        });
    }
});
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