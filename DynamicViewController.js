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
    //endregion

    //region Private
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

    applyDynamicControl: function () {
        var me = this;
        Ext.Object.each(me.dynamicControl, function (configName, config) {
            if (!me[configName]) {
                var events = null;
                var listeners = me[configName].listeners;
                if (listeners) {
                    events = Ext.Object.getKeys(me[configName].listeners);
                }
                me[configName] = new DynamicComponentQuery({
                    view: me.getView(),
                    query: config.selector || config.query,
                    excludeQuery: config.excludeQuery,
                    methods: config.methods,
                    events: events
                });
                if (listeners) {
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