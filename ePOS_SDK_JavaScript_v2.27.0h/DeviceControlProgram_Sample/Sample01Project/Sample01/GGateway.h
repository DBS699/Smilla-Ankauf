#ifdef GGATEWAY_EXPORTS
#define GGATEWAY_API __declspec(dllexport)
#else
#define GGATEWAY_API __declspec(dllimport)
#endif

#include "Element.h"

#define METHODNAME_MAX 128	/*Maximum number of characters in method name*/

/*Return value from GGateway.dll*/
#define GG_SUCCESS			 0
#define GG_SOCKET_ERROR		-1
#define GG_INTERNAL_ERROR	-2
#define GG_PARAM_ERROR		-3
#define GG_EPOS_SYS_ERROR	-4
#define GG_ALREADY_OPENED	-5
#define GG_NO_DATA			-6
#define GG_RECV_DISCONNECT	-7
#define GG_NOT_OPENED		-8

/*Initialization result of control program*/
#define OPEN_SUCCESS		 0
#define DEVICE_NOT_FOUND	-1
#define DEVICE_IN_USE		-2
#define DEVICE_OPEN_ERROR	-3
#define PARAM_ERROR			-4
#define SYSTEM_ERROR		-5

/*This class is exported from the GGateway.dll*/
class GGATEWAY_API GGateway
{
public:
	/*Public method of GGateway.dll*/
	/*Open socket*/
	static int Open(int Port, const char* DeviceID, bool XmlLog = true, bool SingleThread = true, int StatusCode = OPEN_SUCCESS);
	/*Receive data via socket*/
	static int Receive(char*  MethodName, Element* ReceiveData, unsigned int* SequenceNo = NULL);
	/*Send data via socket*/
	static int Send(const char* EventName, Element* SendData, unsigned int SequenceNo = 0);
	/*Close socket*/
	static int Close();
	/*Send data via socket(Error only)*/
	static int SendError(const char* ErrorCode, unsigned int SequenceNo = 0);
};

