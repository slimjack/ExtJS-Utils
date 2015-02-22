Ext.define('Ext.ux.util.ComponentQuery', {
    alternateClassName: 'ComponentQuery',
    defaultMethods: ['on', 'un', 'mon', 'mun', 'disable', 'enable', 'setReadOnly'],
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
        var components = me.view.query(me.query);
        if (me.excludeQuery) {
            return Ext.Array.difference(components, me.view.query(me.excludeQuery));
        } else {
            return components;
        }
    }
});
