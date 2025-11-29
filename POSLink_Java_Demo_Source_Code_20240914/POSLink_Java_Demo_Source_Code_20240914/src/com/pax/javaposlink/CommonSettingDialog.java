package com.pax.javaposlink;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ItemEvent;

public class CommonSettingDialog extends JFrame {
    JTextField destIp, destPort, serialPort, baudRate, timeOut;
    JComboBox<String> type;

    public CommonSettingDialog() throws HeadlessException {
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        setSize(320, 240);
        setTitle("CommonSetting");

        type = new JComboBox<>();
        type.addItem("TCP");
        type.addItem("SSL");
        type.addItem("HTTP");
        type.addItem("HTTPS");
        type.addItem("UART");
        JPanel bord = new JPanel();
        bord.setLayout(new BorderLayout());
        bord.setBorder(new EmptyBorder(10, 10, 10, 10));
        add(bord);
        JPanel grid = new JPanel();
        grid.setLayout(new GridLayout(0, 1, 0, 5));
        grid.setBorder(new EmptyBorder(10, 0, 10, 0));
        bord.add(grid, BorderLayout.CENTER);

        type.addItemListener(e -> {
            switch (e.getStateChange()) {
                case ItemEvent.SELECTED:
                    if ("TCP".equals(e.getItem()) || "SSL".equals(e.getItem())
                            || "HTTP".equals(e.getItem()) || "HTTPS".equals(e.getItem())) {
                        showNetSetting(grid);
                    } else if ("UART".equals(e.getItem())) {
                        showUartSetting(grid);
                    }
                    break;
                case ItemEvent.DESELECTED:
                    break;
            }
        });

        int commType = ParameterManager.getInstance().getType();
        if (commType <= 3) {
            showNetSetting(grid);
        } else if (commType == 4) {
            showUartSetting(grid);
        }
        type.setSelectedIndex(commType);

        JLabel ltype = new JLabel("CommType");
        JPanel ptype = new JPanel(new BorderLayout(10, 0));
        ptype.add(ltype, BorderLayout.WEST);
        ptype.add(type, BorderLayout.CENTER);
        bord.add(ptype, BorderLayout.NORTH);

        JButton button = new JButton("OK");
        button.addActionListener(new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                int timeout = Integer.parseInt(timeOut.getText().replace(",", ""));
                switch (type.getSelectedIndex()) {
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                        ParameterManager.setNetParam(type.getSelectedIndex(), destIp.getText(), destPort.getText(), timeout);
                        break;
                    case 4:
                        ParameterManager.setUartParam(serialPort.getText(), baudRate.getText(), timeout);
                        break;
                }
                dispose();
            }
        });
        bord.add(button, BorderLayout.SOUTH);
    }

    private void showNetSetting(JPanel grid) {

        destIp = new JFormattedTextField(ParameterManager.getInstance().getIp());
        JPanel panelIpAddress = new JPanel(new BorderLayout(10, 0));
        panelIpAddress.add(new JLabel("Dest IP"), BorderLayout.WEST);
        panelIpAddress.add(destIp, BorderLayout.CENTER);


        destPort = new JFormattedTextField(ParameterManager.getInstance().getPort());
        JPanel panelTcpPort = new JPanel(new BorderLayout(10, 0));
        panelTcpPort.add(new JLabel("Dest Port"), BorderLayout.WEST);
        panelTcpPort.add(destPort, BorderLayout.CENTER);


        timeOut = new JFormattedTextField(ParameterManager.getInstance().getTimeout());
        JPanel panelTimeout = new JPanel(new BorderLayout(10, 0));
        panelTimeout.add(new JLabel("TimeOut"), BorderLayout.WEST);
        panelTimeout.add(timeOut, BorderLayout.CENTER);

        grid.removeAll();
        grid.add(panelIpAddress);
        grid.add(panelTcpPort);
        grid.add(panelTimeout);
        getContentPane().validate();
    }

    private void showUartSetting(JPanel grid) {
        serialPort = new JFormattedTextField(ParameterManager.getInstance().getSerialPort());
        JPanel panelSerialPort = new JPanel(new BorderLayout(10, 0));
        panelSerialPort.add(new JLabel("Serial Port"), BorderLayout.WEST);
        panelSerialPort.add(serialPort, BorderLayout.CENTER);


        baudRate = new JFormattedTextField(ParameterManager.getInstance().getBaudRate());
        JPanel panelBaudRate = new JPanel(new BorderLayout(10, 0));
        panelBaudRate.add(new JLabel("Baud Rate"), BorderLayout.WEST);
        panelBaudRate.add(baudRate, BorderLayout.CENTER);


        timeOut = new JFormattedTextField(ParameterManager.getInstance().getTimeout());
        JPanel panelTimeout = new JPanel(new BorderLayout(10, 0));
        panelTimeout.add(new JLabel("TimeOut"), BorderLayout.WEST);
        panelTimeout.add(timeOut, BorderLayout.CENTER);


        grid.removeAll();
        grid.add(panelSerialPort);
        grid.add(panelBaudRate);
        grid.add(panelTimeout);
        getContentPane().validate();
    }

}
