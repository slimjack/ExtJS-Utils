﻿//https://github.com/slimjack/ExtJs-Utils

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
