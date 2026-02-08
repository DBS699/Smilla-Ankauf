=========================================================================
                 Sample program for device control program

          Copyright Seiko Epson Corporation 2017-2019 All rights reserved.
=========================================================================

1. About this software

  The sample program for device control program is a sample for the 
  developer who develops the program to control peripherals connected 
  with the TM-DT series. 

  For details, refer to the TM-DT series peripherals control guide.


2. Supplied Files

  ÅEGGateway.dll
    It is a communication library for device control program to send and 
    receive data with TM-DT software.

  ÅESample01.exe
    It is a sample program of device control program.
    (Complete project included.)

  ÅEDevCtrlPrgTester.exe
    It is a tool for checking the operation of device control program 
    developed.


3. How to use

  Start DevCtrlPrgTester.exe and wait for socket communication start.
  When Sample01.exe is started, it automatically establishes socket 
  communication.
  Send command from DevCtrlPrgTester.exe.
  Sample01.exe receives the command and returns a response.
  The response from the Sample01.exe is displayed in DevCtrlPrgTester.exe.
  If you run Delete Device on DevCtrlPrgTester.exe, communication will 
  end.


4. Remarks

  The Sample01.exe project is created in Microsoft Visual C ++ 2008.
  Please use it according to your development environment.


5. Restriction


