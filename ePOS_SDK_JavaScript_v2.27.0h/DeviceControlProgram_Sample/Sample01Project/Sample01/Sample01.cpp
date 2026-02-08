#include "stdafx.h"

void showElementData(Element* elmData);
const char* cStatusCode[6] = {"OPEN_SUCCESS", "DEVICE_NOT_FOUND", "DEVICE_IN_USE", "DEVICE_OPEN_ERROR", "PARAM_ERROR", "SYSTEM_ERROR"};

int _tmain(int argc, char* argv[])
{
	int  iPort = 60005;
	char cDeviceID[128];
	strcpy_s(cDeviceID, 128, "SampleDevice");

	/*argv:exe, int Port, const char* DeviceID*/
	if(argc < 3)
	{
		printf("Please set command parameter.\r\n");
		printf("Sample01.exe PortNumber DeviceID\r\n");
		printf("PortNumber:Communication port number with server.(Below 65535. default = 60005)\r\n");
		printf("DeviceID:OPOS Device ID(Name).\r\n");
		printf("Start with default parameters(PortNo:60005  Device ID:SampleDevice)");
	}
	else
	{
		/*Analyze parameter*/
		iPort = atoi(argv[1]);
		strcpy_s(cDeviceID, 128, argv[2]);
	}

	/*Open process*/
	int iResult = GGateway::Open(iPort, cDeviceID, true, true);

	while(iResult == GG_SUCCESS)
	{
		{
			Element elmRecv;
			char cMethodName[METHODNAME_MAX];
			unsigned int iSeqNo = 0;
			/*Request receive process*/
			printf("\r\n");
			printf("Recieve¥¥¥\r\n");
			iResult = GGateway::Receive(cMethodName, &elmRecv, &iSeqNo);
			if(iResult != GG_SUCCESS)
			{
				break;
			}
			printf("Receive Result:%d\r\n", iResult);
			printf(cMethodName);
			printf("\r\n");
			printf("SequenceNo = %u\r\n", iSeqNo);
			showElementData(&elmRecv);
			printf("\r\n");

			/*Responce send process*/
			char cName[128], cValue[128];
			strcpy_s(cName, 128, elmRecv.getName());
			strcpy(cValue, elmRecv.getValue());
			Element elmSend(cName, cValue);

			char cChildName[] = "status";
			char cChildValue[] = "OK";
			char cType[] = "string";
			bool bArray = false;
			Element elmSendChild(cChildName, cChildValue, cType, bArray);

			elmSend.addChild(&elmSendChild);

			printf("\r\n");
			printf("Send¥¥¥\r\n");
			iResult = GGateway::Send(cMethodName, &elmSend, iSeqNo);
			if(iResult != GG_SUCCESS)
			{
				break;
			}
			printf("Send Result:%d\r\n", iResult);
			printf(cMethodName);
			printf("\r\n");
			printf("SequenceNo = %u\r\n", iSeqNo);
			showElementData(&elmSend);
			printf("\r\n");
		}
	}

	/*Close process*/
	GGateway::Close();

	return 0;
}

/*Parse and show of elements*/
void showElementData(Element* elmData)
{
	printf(" Name = ");
	printf(elmData->getName());
	printf("\r\n Value = ");
	printf(elmData->getValue());
	printf("\r\n");
	for(int i = 0; i < elmData->getChildrenNum(); i++)
	{
		printf("ChildData(%d):\r\n", i);
		showElementData(elmData->getChild(i));
	}
}
