/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Nightly Tester Tools
 *
 * The Initial Developer of the Original Code is
 *      Dave Townsend <dave.townsend@blueprintit.co.uk>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK *****
 *
 * $HeadURL$
 * $LastChangedBy$
 * $Date$
 * $Revision$
 *
 */

#ifndef _nttStreamFunctions_h_
#define _nttStreamFunctions_h_

#include "nscore.h"
#include "nsIInputStream.h"
#include "nsIOutputStream.h"

#define WRITE8(buf, off, val)  buf[off++] = val & 0xff
#define WRITE16(buf, off, val) buf[off++] = val & 0xff; \
                               buf[off++] = (val >> 8) & 0xff
#define WRITE32(buf, off, val) buf[off++] = val & 0xff; \
                               buf[off++] = (val >> 8) & 0xff; \
                               buf[off++] = (val >> 16) & 0xff; \
                               buf[off++] = (val >> 24) & 0xff

#define READ8(buf, off, val)  val  = (PRUint8)buf[off++]
#define READ16(buf, off, val) val  = (PRUint16)buf[off++] & 0xff; \
                              val += ((PRUint16)buf[off++] & 0xff) << 8
#define READ32(buf, off, val) val  = (PRUint32)buf[off++] & 0xff; \
                              val += ((PRUint32)buf[off++] & 0xff) << 8; \
                              val += ((PRUint32)buf[off++] & 0xff) << 16; \
                              val += ((PRUint32)buf[off++] & 0xff) << 24

nsresult NTT_ReadData(nsIInputStream *stream, char *buf, PRUint32 count);

nsresult NTT_WriteData(nsIOutputStream *stream, const char *buf, PRUint32 count);

#endif
