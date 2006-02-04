/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM nsILogModule.idl
 */

#ifndef __gen_nsILogModule_h__
#define __gen_nsILogModule_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    nsILogModule */
#define NS_ILOGMODULE_IID_STR "cb84fdb3-b3c8-457b-99c9-514f8353fcc5"

#define NS_ILOGMODULE_IID \
  {0xcb84fdb3, 0xb3c8, 0x457b, \
    { 0x99, 0xc9, 0x51, 0x4f, 0x83, 0x53, 0xfc, 0xc5 }}

class NS_NO_VTABLE nsILogModule : public nsISupports {
 public: 

  NS_DEFINE_STATIC_IID_ACCESSOR(NS_ILOGMODULE_IID)

  enum { PR_LOG_NONE = 0 };

  enum { PR_LOG_ALWAYS = 1 };

  enum { PR_LOG_ERROR = 2 };

  enum { PR_LOG_WARNING = 3 };

  enum { PR_LOG_DEBUG = 4 };

  enum { PR_LOG_NOTICE = 4 };

  enum { PR_LOG_WARN = 3 };

  enum { PR_LOG_MIN = 4 };

  enum { PR_LOG_MAX = 4 };

  /* readonly attribute long level; */
  NS_IMETHOD GetLevel(PRInt32 *aLevel) = 0;

  /* void init (in AString name); */
  NS_IMETHOD Init(const nsAString & name) = 0;

  /* void log (in long level, in AString message); */
  NS_IMETHOD Log(PRInt32 level, const nsAString & message) = 0;

};

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_NSILOGMODULE \
  NS_IMETHOD GetLevel(PRInt32 *aLevel); \
  NS_IMETHOD Init(const nsAString & name); \
  NS_IMETHOD Log(PRInt32 level, const nsAString & message); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_NSILOGMODULE(_to) \
  NS_IMETHOD GetLevel(PRInt32 *aLevel) { return _to GetLevel(aLevel); } \
  NS_IMETHOD Init(const nsAString & name) { return _to Init(name); } \
  NS_IMETHOD Log(PRInt32 level, const nsAString & message) { return _to Log(level, message); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_NSILOGMODULE(_to) \
  NS_IMETHOD GetLevel(PRInt32 *aLevel) { return !_to ? NS_ERROR_NULL_POINTER : _to->GetLevel(aLevel); } \
  NS_IMETHOD Init(const nsAString & name) { return !_to ? NS_ERROR_NULL_POINTER : _to->Init(name); } \
  NS_IMETHOD Log(PRInt32 level, const nsAString & message) { return !_to ? NS_ERROR_NULL_POINTER : _to->Log(level, message); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class nsLogModule : public nsILogModule
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSILOGMODULE

  nsLogModule();

private:
  ~nsLogModule();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(nsLogModule, nsILogModule)

nsLogModule::nsLogModule()
{
  /* member initializers and constructor code */
}

nsLogModule::~nsLogModule()
{
  /* destructor code */
}

/* readonly attribute long level; */
NS_IMETHODIMP nsLogModule::GetLevel(PRInt32 *aLevel)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void init (in AString name); */
NS_IMETHODIMP nsLogModule::Init(const nsAString & name)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* void log (in long level, in AString message); */
NS_IMETHODIMP nsLogModule::Log(PRInt32 level, const nsAString & message)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_nsILogModule_h__ */
