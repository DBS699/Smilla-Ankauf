#pragma once

#ifdef GGATEWAY_EXPORTS
#define LIBGGATEWAY_API __declspec(dllexport)
#else
#define LIBGGATEWAY_API __declspec(dllimport)
#endif

#include <iostream>
#include <string>
#include <vector>

#define STR_TYPE_NUMBER		"number"	/*String definition for numeric type*/
#define STR_TYPE_STRING		"string"	/*String definition of character type*/

class LIBGGATEWAY_API Element
{
private:
	std::string* m_pName;				/*Element name*/
	std::string* m_pValue;				/*String value of the element*/
	std::string* m_pType;				/*Type of element value*/
	bool m_bArray;						/*Boolean value as to whether the element is an array*/
	std::vector<Element>* m_pvChildren;	/*Variable length array of child elements*/
	Element* m_pEleParent;				/*Pointer of parent element*/

public:
	/*Constructor(For an empty object)*/
	Element();
	/*Constructor(Specify only name)*/
	explicit Element(const char* Name);
	/*Constructor(Specify the value as a string)*/
	Element(const char* Name, const char*  Value, const char* Type = STR_TYPE_STRING, bool Array = false);
	/*Constructor(Specify the value as a numerical value)*/
	Element(const char* Name, long Value, const char* Type = STR_TYPE_NUMBER, bool Array = false);
	/*Copy constructor*/
	Element(const Element &obj);
	/*Assignment operator*/
	Element &operator=(const Element &obj);
	/*Destructor*/
	~Element(void);

	/*Get element name*/
	const char* getName() const;
	/*Get value of element as string*/
	const char* getValue() const;
	/*Get the value type of the element*/
	const char* getType() const;
	/*Get parent element*/
	Element* getParent() const;
	/*Get presence / absence of child element*/
	bool haveChild() const;
	/*Get number of child elements*/
	int getChildrenNum() const;
	/*Get child element*/
	Element* getChild(int nNum) const;
	/*Get child elements from name*/
	Element* getChild(const char* Name) const;
	/*Add child elements*/
	bool addChild(Element* pChild);
	/*Set a flag indicating the array in the element*/
	bool setArrayFlag(bool Array);

	/*Add child element to the first*/
	bool insertChild(Element* pChild);
	/*Set parent element*/
	bool setParent(Element* pParent);
	/*Set element name*/
	void setName(std::string Name);
	/*Set values and types for elements*/
	bool setValue(const char* strValue, const char* strType = STR_TYPE_STRING);
	/*Whether the element is an array*/
	bool isArray() const;
	/*Delete the first child element that matches the specified character string*/
	void deleteChild(const char* Name);
};
