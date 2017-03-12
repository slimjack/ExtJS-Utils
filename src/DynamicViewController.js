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
