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
    //endregion

    //region Private methods
    relayComponentsEvents: function () {
        var me = this;
        me.each(function(component) {
            me.relayEvents(component, me._events);
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
            Ext.Array.each(addedComponents, function (component) {
                me.relayEvents(component, me._events);
            });
            me.fireEvent('queryadd', addedComponents);
        }
    },

    onRemoveComponent: function() {
        var me = this;
        var oldComponents = me._selectedComponents;
        me._selectedComponents = null;
        var newComponents = me.select();
        var removedComponents = Ext.Array.difference(oldComponents, newComponents);
        if (removedComponents.length) {
            me.fireEvent('queryremove', removedComponents);
        }
    }
    //endregion
});
