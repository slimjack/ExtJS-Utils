Ext.define('Ext.ux.util.ComponentQuery', {
    alternateClassName: 'ComponentQuery',
    defaultMethods: ['on', 'un', 'mon', 'mun', 'disable', 'enable', 'setReadOnly'],
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
        this.mixins.observable.constructor.call(this, config);
        Ext.apply(this, config);
        if (!me.query) {
            Ext.Error.raise('"query" is not specified');
        }
        if (!me.view) {
            Ext.Error.raise('"view" is not specified');
        }
        if (!(me.view instanceof Ext.AbstractComponent)) {
            Ext.Error.raise('"view" is not an instance of Ext.AbstractComponent');
        }
        me.methods = Ext.Array.union(me.defaultMethods, Ext.Array.from(me.methods));
        me.createProxyMethod(me.methods);
        if (me.view instanceof Ext.container.Container) {
            me.view.on('add', me.onAddComponent, me);
            me.view.on('remove', me.onAddComponent, me);
        }
    },

    createProxyMethod: function (methods) {
        var me = this;
        methods = Ext.Array.from(methods);
        Ext.Array.forEach(methods, function (method) {
            if (!me[method]) {
                me[method] = Ext.bind(me.invoke, me, [method], 0);
            }
        });
    },

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
            me.fireEvent('add', addedComponents);
        }
    },

    onRemoveComponent: function() {
        var me = this;
        var oldComponents = me._selectedComponents;
        me._selectedComponents = null;
        var newComponents = me.select();
        var removedComponents = Ext.Array.difference(oldComponents, newComponents);
        if (removedComponents.length) {
            me.fireEvent('remove', removedComponents);
        }
    }
});
