package com.pax.javaposlink;

import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.GridLayout;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;

import javax.swing.AbstractAction;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import javax.swing.border.EmptyBorder;

public class MainDialog extends JFrame implements ActionListener, OnResultCallback {
    private final ArrayList<String> commandTitles;
    JTextField textField;
    JTextArea textRes;
    JLabel infoLabel;

    public MainDialog(ArrayList<String> cmdLists, OnClickListener clickListener) {
        this.clickListener = clickListener;
        this.commandTitles = cmdLists;
        setTitle("POSLink Java Demo");
        initView();
    }

    private OnClickListener clickListener = null;

    private void initView() {
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(540, 180);
        setLocationRelativeTo(null);
        JPanel bord = new JPanel();
        bord.setLayout(new BorderLayout());
        bord.setBorder(new EmptyBorder(5, 5, 5, 5));
        add(bord);
        JPanel grid = new JPanel();
        grid.setLayout(new GridLayout(0, 1, 0, 5));
        grid.setBorder(new EmptyBorder(5, 0, 5, 0));
        JPanel card = new JPanel();
        card.setLayout(new CardLayout());
        bord.add(grid, BorderLayout.WEST);
        JButton cbSetting = new JButton("Comm Setting");
        cbSetting.addActionListener(new AbstractAction() {
            @Override
            public void actionPerformed(ActionEvent e) {
                CommonSettingDialog dialog = new CommonSettingDialog();
                dialog.setLocationRelativeTo(MainDialog.this);
                dialog.setVisible(true);
            }
        });
        grid.add(cbSetting);
        if (commandTitles != null) {
            for (String item : commandTitles) {
                JButton button = new JButton(item);
                if (clickListener != null) {
                    button.addActionListener(this);
                }
                grid.add(button);
            }
        }
        textRes = new JTextArea();
        textRes.setMargin(new Insets(4, 6, 4, 6));
        infoLabel = new JLabel("Powered by PAX.");
        JScrollPane scrollPane = new JScrollPane(textRes);
        scrollPane.setBorder(new EmptyBorder(5,5,5,5));
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        bord.add(infoLabel, BorderLayout.SOUTH);
        bord.add(scrollPane, BorderLayout.CENTER);
    }

    public void showDialog() {
        setVisible(true);
    }

    @Override
    public void actionPerformed(ActionEvent e) {
        String actionName = "";
        if (e.getSource() instanceof JButton) {
            actionName = ((JButton) e.getSource()).getActionCommand();
        }
        if (clickListener != null) {
            String text = "";
            if (textField != null) {
                text = textField.getText();
            }
            clickListener.onClick(actionName, text, this);
        }
    }

    @Override
    public void onShowResult(String result) {
        SwingUtilities.invokeLater(() -> {
            if (textRes != null) {
                textRes.setText(result);
            }
        });
    }

    public void setInfoMessage(String msg) {
        infoLabel.setText(msg);
    }
}
