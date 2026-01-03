package com.pax.javaposlink;

import com.pax.poscore.commsetting.*;

public class ParameterManager {
    private static ParameterManager instance;
    private int type;
    private String ip;
    private String port;
    private String serialPort;
    private String baudRate;
    private int timeout;

    private ParameterManager() {
        type = 0;
        ip = "127.0.0.1";
        port = "10009";
        serialPort = "COM1";
        baudRate = "9600";
        timeout = 60000;
    }

    public static synchronized ParameterManager getInstance() {
        if (instance == null) {
            instance = new ParameterManager();
        }
        return instance;
    }

    public CommunicationSetting getCommSetting() {
        switch (type) {
            case 0:
                return new TcpSetting(ip, port, timeout);
            case 1:
                return new SslSetting(ip, port, timeout);
            case 2:
                return new HttpSetting(ip, port, timeout);
            case 3:
                return new HttpsSetting(ip, port, timeout);
            case 4:
                return new UartSetting(serialPort, baudRate, timeout);
            default:
                return new TcpSetting(ip, port, timeout);
        }
    }

    public int getType() {
        return type;
    }

    public void setType(int type) {
        this.type = type;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getPort() {
        return port;
    }

    public void setPort(String port) {
        this.port = port;
    }

    public String getSerialPort() {
        return serialPort;
    }

    public void setSerialPort(String serialPort) {
        this.serialPort = serialPort;
    }

    public String getBaudRate() {
        return baudRate;
    }

    public void setBaudRate(String baudRate) {
        this.baudRate = baudRate;
    }

    public int getTimeout() {
        return timeout;
    }

    public void setTimeout(int timeout) {
        this.timeout = timeout;
    }

    public static void setSetting(int type, String ip, String port, String serialPort, String baudRate, int timeout) {
        getInstance().type = type;
        getInstance().ip = ip;
        getInstance().port = port;
        getInstance().serialPort = serialPort;
        getInstance().baudRate = baudRate;
        getInstance().timeout = timeout;
    }

    public static void setNetParam(int type, String ip, String port, int timeout) {
        getInstance().type = type;
        getInstance().ip = ip;
        getInstance().port = port;
        getInstance().timeout = timeout;
    }

    public static void setUartParam(String serialPort, String baudRate, int timeout) {
        getInstance().type = 4;
        getInstance().serialPort = serialPort;
        getInstance().baudRate = baudRate;
        getInstance().timeout = timeout;
    }

}
