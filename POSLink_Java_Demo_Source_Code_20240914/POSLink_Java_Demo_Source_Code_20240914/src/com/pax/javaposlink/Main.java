package com.pax.javaposlink;

import com.pax.poslinkadmin.ExecutionResult;
import com.pax.poslinkadmin.manage.InitResponse;
import com.pax.poslinksemiintegration.POSLinkSemi;
import com.pax.poslinksemiintegration.Terminal;

import java.util.ArrayList;
import java.util.Locale;

public class Main {
    public static final ArrayList<String> commands = new ArrayList<>();

    static {
        commands.add("Init");
    }

    private static MainDialog main;

    public static void main(String[] args) {
        Locale.setDefault( new Locale("en", "US"));
        main = new MainDialog(commands, new MyClickListener());
        main.showDialog();
    }

    private static class MyClickListener implements OnClickListener {
        Thread transThread;

        @Override
        public void onClick(String name, String text, OnResultCallback resultCallback) {
            switch (name) {
                case "Init":
                    runInit(resultCallback);
                    break;
                default:
                    break;
            }
        }

        private void runAction(Runnable runnable) {
            startActionEx(runnable);
        }

        private void startActionEx(Runnable runnable) {
            if (transThread != null) {
                transThread.interrupt();
            }
            transThread = new Thread(runnable);
            transThread.start();
        }

        private void runInit(OnResultCallback callback) {
            runAction(() -> {
                Terminal terminal = POSLinkSemi.getInstance().getTerminal(ParameterManager.getInstance().getCommSetting());
                if (terminal != null) {
                    ExecutionResult<InitResponse> result = terminal.getManage().init();
                    if (result.isSuccessful()) {
                        StringBuilder messageBuilder = new StringBuilder("Init Success!\n");
                        InitResponse response = result.response();
                        messageBuilder.append("AppName: ").append(response.appName()).append("\n")
                                .append("AppVersion: ").append(response.appVersion()).append("\n")
                                .append("SN: ").append(response.sn()).append("\n")
                                .append("ModelName: ").append(response.modelName()).append("\n")
                                .append("OSVersion: ").append(response.osVersion());
                        callback.onShowResult(messageBuilder.toString());
                    } else {
                        callback.onShowResult("Trans Failed!\n" + "Error Message:" + result.message());
                    }
                } else {
                    callback.onShowResult("Init Failed!");
                }
            });
        }
    }
}
